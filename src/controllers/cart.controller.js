import { addToCartSchema } from "../validations/cart.validation";
import Product from "../models/product.model"; 
import Cart from "../models/cart.model";



// API thêm sản phẩm vào giỏ hàng
export const addToCart = async (req, res) => {
  try {
    // Validate dữ liệu đầu vào
    const { error } = addToCartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { productId, variantAttributes, quantity } = req.body;
    const variantAttrs = Array.isArray(variantAttributes) ? variantAttributes : [];
    
    // Kiểm tra xem sản phẩm có tồn tại và còn hoạt động không
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }
    
    //  Kiểm tra số lượng
    if (quantity <= 0) {
      return res.status(400).json({ message: "Số lượng phải lớn hơn 0" });
    }

    // So sánh biến thể với các thuộc tính yêu cầu
    const variant = product.variation.find(v => {
      return variantAttrs.every(attrReq => {
        const attrInVariant = v.attributes.find(attrVar => attrVar.attributeName === attrReq.attributeName);
        return attrInVariant && attrInVariant.values.includes(attrReq.value);
      });
    });
    
    // Kiểm tra xem biến thể có tồn tại và còn hoạt động không
    if (!variant || !variant.isActive) {
      return res.status(404).json({ message: "Biến thể sản phẩm không tồn tại" });
    }
    
    // Kiểm tra tồn kho
    if (variant.stock < quantity) {
      return res.status(400).json({ message: "Số lượng vượt quá tồn kho" });
    }

    // Nếu đã đăng nhập, lưu vào DB
    if (req.user && req.user._id) {
      let cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) {
        cart = new Cart({ userId: req.user._id, items: [] });
      }
       // Kiểm tra sản phẩm đã có trong giỏ chưa (so sánh cả biến thể)
      const index = cart.items.findIndex(item => {
        if (item.productId.toString() !== productId) return false;
        if (!Array.isArray(item.variantAttributes)) return false;
        return variantAttrs.every(attrReq => {
          const attrInCart = item.variantAttributes.find(attrCart => attrCart.attributeName === attrReq.attributeName);
          return attrInCart && attrInCart.value === attrReq.value;
        });
      });

      // Nếu đã có thì tăng số lượng, nếu chưa có thì thêm mới
      if (index !== -1) {
        cart.items[index].quantity += quantity;
      } else {
        cart.items.push({ productId, variantAttributes: [...variantAttrs], quantity });
      }
      await cart.save();
      return res.status(200).json({ message: "Đã thêm sản phẩm vào giỏ hàng", cart: cart.items });
    }

    // Nếu chưa đăng nhập, lưu vào cookie như cũ
    let cart = [];
    if (req.cookies.cart) {
      try {
        cart = JSON.parse(req.cookies.cart);
      } catch {
        cart = [];
      }
    }
    
    // Kiểm tra sản phẩm đã có trong cookie chưa
    const index = cart.findIndex(item => {
      if (item.productId !== productId) return false;
      if (!Array.isArray(item.variantAttributes)) return false;

      return variantAttrs.every(attrReq => {
        const attrInCart = item.variantAttributes.find(attrCart => attrCart.attributeName === attrReq.attributeName);
        return attrInCart && attrInCart.value === attrReq.value;
      });
    });
    
    // Nếu đã có thì tăng số lượng, nếu chưa có thì thêm mới
    if (index !== -1) {
      cart[index].quantity += quantity;
    } else {
      cart.push({ productId, variantAttributes: [...variantAttrs], quantity });
    }
    
     // Lưu lại cookie
    res.cookie("cart", JSON.stringify(cart), {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ message: "Đã thêm sản phẩm vào giỏ hàng", cart });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

  

// API lấy giỏ hàng
export const getCart = async (req, res) => {
  try {
    let cart = [];
    // Nếu đã đăng nhập, lấy từ DB
    if (req.user && req.user._id) {
      // Lấy cart từ DB cho user đăng nhập
      const dbCart = await Cart.findOne({ userId: req.user._id });
      cart = dbCart ? dbCart.items : [];
    } else if (req.cookies.cart) {
      // Nếu chưa đng nhập, lấy từ cookie
      try {
        cart = JSON.parse(req.cookies.cart);
      } catch {
        cart = [];
      }
    }

    if (!cart || cart.length === 0) {
      return res.status(200).json({ message: "Giỏ hàng của bạn đang trống", cart: [] });
    }

    // Lấy thông tin chi tiết từng sản phẩm trong giỏ hàng
    const cartDetails = await Promise.all(
      cart.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product || !product.isActive) return null;

        // Tìm biến thể đúng theo variantAttributes
        // variantAttributes(mảng thuộc tính các biến thể mà người dùng chọn khi thêm vào giỏ hàng)
        const variant = product.variation.find(v => {
          if (!Array.isArray(item.variantAttributes)) return false;
          return item.variantAttributes.every(attrReq => {
            const attrInVariant = v.attributes.find(attrVar =>
              attrVar.attributeName === attrReq.attributeName
            );
            return attrInVariant && attrInVariant.values.includes(attrReq.value);
          });
        });

        if (!variant || !variant.isActive) return null;

        const itemTotal = (variant.salePrice > 0 ? variant.salePrice : variant.regularPrice) * item.quantity;

        return {
          productId: item.productId,
          name: product.name,
          image: variant.image || (product.image?.[0] ?? null),
          color: variant.attributes.find(attr => attr.attributeName === "Màu sắc")?.values[0] || null,
          size: variant.attributes.find(attr => attr.attributeName === "Kích thước")?.values[0] || null,
          price: variant.salePrice > 0 ? variant.salePrice : variant.regularPrice,
          quantity: item.quantity,
          itemTotal,
        };
      })
    );

    // Loại bỏ các phần tử null (sản phẩm không còn hợp lệ)
    const filteredCart = cartDetails.filter(Boolean);

    if (filteredCart.length === 0) {
      return res.status(200).json({ message: "Giỏ hàng của bạn đang trống", cart: [] });
    }

    const totalAmount = filteredCart.reduce((sum, item) => sum + item.itemTotal, 0);

    return res.status(200).json({ cart: filteredCart, totalAmount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
  
  

export const removeCart = async (req, res) => {
  try {
    const { productId, variantAttributes } = req.body;
    const variantAttrs = Array.isArray(variantAttributes) ? variantAttributes : [];

    if (req.user && req.user._id) {
      // Xử lý với DB cho user đăng nhập
      let cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) return res.status(404).json({ message: "Giỏ hàng không tồn tại" });

      const beforeLength = cart.items.length;
      // Lọc bỏ các sản phẩm cần xóa
      cart.items = cart.items.filter(item => {
        if (item.productId.toString() !== productId) return true;
        if (!Array.isArray(item.variantAttributes)) return true;
        if (item.variantAttributes.length !== variantAttrs.length) return true;
        return !variantAttrs.every(attrReq => {
          const attrInCart = item.variantAttributes.find(attrCart => attrCart.attributeName === attrReq.attributeName);
          return attrInCart && attrInCart.value === attrReq.value;
        });
      });

      if (cart.items.length === beforeLength) {
        return res.status(404).json({ message: "Sản phẩm cần xóa không tồn tại trong giỏ hàng" });
      }

      await cart.save();
      return res.status(200).json({ message: "Đã xóa sản phẩm khỏi giỏ hàng", cart: cart.items });
    }

    // Xử lý với cookie cho khách
    let cart = [];
    if (req.cookies.cart) {
      try {
        cart = JSON.parse(req.cookies.cart);
      } catch {
        cart = [];
      }
    }

    const beforeLength = cart.length;
    // Lọc bỏ các sản phẩm cần xóa
    cart = cart.filter(item => {
      if (item.productId !== productId) return true;
      if (!Array.isArray(item.variantAttributes)) return true;
      if (item.variantAttributes.length !== variantAttrs.length) return true;
      return !variantAttrs.every(attrReq => {
        const attrInCart = item.variantAttributes.find(attrCart => attrCart.attributeName === attrReq.attributeName);
        return attrInCart && attrInCart.value === attrReq.value;
      });
    });

    if (cart.length === beforeLength) {
      return res.status(404).json({ message: "Sản phẩm cần xóa không tồn tại trong giỏ hàng" });
    }

    res.cookie("cart", JSON.stringify(cart), {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ message: "Đã xóa sản phẩm khỏi giỏ hàng", cart });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
  
  
export const updateCartQuantity = async (req, res) => {
  try {
    // Validate dữ liệu đầu vào
    const { error } = addToCartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    const { productId, variantAttributes, quantity } = req.body;
    const variantAttrs = Array.isArray(variantAttributes) ? variantAttributes : [];
    
    // Kiểm tra xem sản phẩm có tồn tại và còn hoạt động không
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }
    
    //So sánh biến thể
    const variant = product.variation.find(v => {
      return variantAttrs.every(attrReq => {
        const attrInVariant = v.attributes.find(attrVar => attrVar.attributeName === attrReq.attributeName);
        return attrInVariant && attrInVariant.values.includes(attrReq.value);
      });
    });

    if (!variant || !variant.isActive) {
      return res.status(404).json({ message: "Biến thể sản phẩm không tồn tại" });
    }

    if (variant.stock < quantity) {
      return res.status(400).json({ message: "Số lượng vượt quá tồn kho" });
    }

    if (req.user && req.user._id) {
      // Xử lý với DB cho user đăng nhập
      let cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) return res.status(404).json({ message: "Giỏ hàng không tồn tại"});
      
      // Tìm sản phẩm cần cập nhật trong giỏ hàng
      const index = cart.items.findIndex(item => {
        if (item.productId.toString() !== productId) return false;
        if (!Array.isArray(item.variantAttributes)) return false;
        return variantAttrs.every(attrReq => {
          const attrInCart = item.variantAttributes.find(attrCart => attrCart.attributeName === attrReq.attributeName);
          return attrInCart && attrInCart.value === attrReq.value;
        });
      });

      if (index === -1) {
        return res.status(404).json({ message: "Sản phẩm này chưa có trong giỏ hàng" });
      }

      // Nếu số lượng là 0 thì xóa, ngược lại thì cập nhật số lượng
      if (quantity === 0) {
        cart.items.splice(index, 1);
      } else {
        cart.items[index].quantity = quantity;
      }

      await cart.save();
      return res.status(200).json({ message: "Cập nhật giỏ hàng thành công", cart: cart.items });
    }

    // Xử lý với cookie cho khách
    let cart = [];
    if (req.cookies.cart) {
      try {
        cart = JSON.parse(req.cookies.cart);
      } catch {
        cart = [];
      }
    }
    
    // Tìm sản phẩm cần cập nhật trong giỏ hàng
    const index = cart.findIndex(item => {
      if (item.productId !== productId) return false;
      if (!Array.isArray(item.variantAttributes)) return false;
      return variantAttrs.every(attrReq => {
        const attrInCart = item.variantAttributes.find(attrCart => attrCart.attributeName === attrReq.attributeName);
        return attrInCart && attrInCart.value === attrReq.value;
      });
    });

    if (index === -1) {
      return res.status(404).json({ message: "Sản phẩm này chưa có trong giỏ hàng" });
    }
    
     // Nếu quantity = 0 thì xóa, ngược lại cập nhật số lượng
    if (quantity === 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = quantity;
    }

    res.cookie("cart", JSON.stringify(cart), {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ message: "Cập nhật giỏ hàng thành công", cart });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// Hàm đồng bộ giỏ hàng từ cookie lên DB khi user đăng nhập
export const syncCart = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Bạn chưa đăng nhập" });
    }
    // Lấy giỏ hàng từ cookie
    let cookieCart = [];
    if (req.cookies.cart) {
      try {
        cookieCart = JSON.parse(req.cookies.cart);
      } catch {
        cookieCart = [];
      }
    }
    if (!cookieCart.length) {
      return res.status(200).json({ message: "Không có dữ liệu cần đồng bộ" });
    }
    // Lấy giỏ hàng từ DB
    let dbCart = await Cart.findOne({ userId: req.user._id });
    if (!dbCart) {
      dbCart = new Cart({ userId: req.user._id, items: [] });
    }

    // Danh sách sản phẩm bị bỏ qua khi đồng bộ
    const skippedItems = [];

    // Merge từng sản phẩm từ cookie vào DB
    for (const cookieItem of cookieCart) {
      // Kiểm tra sản phẩm và biến thể có còn tồn tại không
      const product = await Product.findById(cookieItem.productId);
      if (!product || !product.isActive) {
        skippedItems.push({
          ...cookieItem,
          reason: "Sản phẩm không tồn tại hoặc đã bị ẩn"
        });
        continue;
      }
      const variantAttrs = Array.isArray(cookieItem.variantAttributes) ? cookieItem.variantAttributes : [];
      const variant = product.variation.find(v =>
        variantAttrs.every(attrReq => {
          const attrInVariant = v.attributes.find(attrVar => attrVar.attributeName === attrReq.attributeName);
          return attrInVariant && attrInVariant.values.includes(attrReq.value);
        })
      );
      if (!variant || !variant.isActive) {
        skippedItems.push({
          ...cookieItem,
          reason: "Biến thể không tồn tại"
        });
        continue;
      }
      if (variant.stock <= 0) {
        skippedItems.push({
          ...cookieItem,
          reason: "Sản phẩm đã hết hàng"
        });
        continue;
      }

      // Kiểm tra đã có trong DB chưa
      const index = dbCart.items.findIndex(item => {
        if (item.productId.toString() !== cookieItem.productId) return false;
        if (!Array.isArray(item.variantAttributes)) return false;
        return variantAttrs.every(attrReq => {
          const attrInCart = item.variantAttributes.find(attrCart => attrCart.attributeName === attrReq.attributeName);
          return attrInCart && attrInCart.value === attrReq.value;
        });
      });
      
       // Nếu đã có thì cộng dồn số lượng, chưa có thì thêm mới
      if (index !== -1) {
        // Kiểm tra xem sản phẩm đồng bộ có vượt quá tồn kho không. Nếu vượt thì bỏ qua
        const newQuantity = dbCart.items[index].quantity + cookieItem.quantity;
        if (variant.stock < newQuantity) {
          skippedItems.push({
            ...cookieItem,
            reason: "Tổng số lượng vượt quá tồn kho khi đồng bộ"
          });
          continue;
        }
        dbCart.items[index].quantity = newQuantity;
      } else {
        dbCart.items.push({
          productId: cookieItem.productId,
          variantAttributes: [...variantAttrs], 
          quantity: cookieItem.quantity,
        });
      }
    }

    await dbCart.save();

    // Xóa cookie giỏ hàng sau khi đồng bộ
    res.clearCookie("cart");

    return res.status(200).json({
      message: "Đồng bộ giỏ hàng thành công",
      cart: dbCart.items,
      skippedItems // trả về danh sách sản phẩm không đồng bộ được
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};