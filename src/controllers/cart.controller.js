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

    const { productId, variantId, quantity } = req.body;

    // Kiểm tra sản phẩm có tồn tại
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }

    // Tìm biến thể trong product.variation
    const variant = product.variation.find(v => v._id.toString() === variantId);
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

      // Tìm sản phẩm + biến thể đã có trong giỏ chưa
      const index = cart.items.findIndex(item => 
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
      );

      // Tính toán tổng số lượng sau khi thêm
      const currentQuantity = index !== -1 ? cart.items[index].quantity : 0;
      const newTotalQuantity = currentQuantity + quantity;

      // Kiểm tra tồn kho với tổng số lượng mới
      if (variant.stock < newTotalQuantity) {
        return res.status(400).json({ 
          message: "Số lượng vượt quá tồn kho",
          // Số lượng tồn kho hiện tại
          availableStock: variant.stock,
          // Số lượng hiện tại trong giỏ hàng
          currentCartQuantity: currentQuantity
        });
      }

      if (index !== -1) {
        cart.items[index].quantity = newTotalQuantity;
      } else {
        cart.items.push({ productId, variantId, quantity });
      }

      await cart.save();
      return res.status(200).json({ message: "Đã thêm sản phẩm vào giỏ hàng", cart: cart.items });
    }

    // Nếu chưa đăng nhập, lưu vào cookie
    let cart = [];
    if (req.cookies.cart) {
      try {
        cart = JSON.parse(req.cookies.cart);
      } catch {
        cart = [];
      }
    }

    const index = cart.findIndex(item => 
      item.productId === productId && item.variantId === variantId
    );

    // Tính toán tổng số lượng sau khi thêm cho cookie cart
    const currentQuantity = index !== -1 ? cart[index].quantity : 0;
    const newTotalQuantity = currentQuantity + quantity;

    // Kiểm tra tồn kho với tổng số lượng mới
    if (variant.stock < newTotalQuantity) {
      return res.status(400).json({ 
        message: "Số lượng vượt quá tồn kho",
        // Số lượng tồn kho hiện tại
        availableStock: variant.stock,
        // Số lượng hiện tại trong giỏ hàng
        currentCartQuantity: currentQuantity
      });
    }

    if (index !== -1) {
      cart[index].quantity = newTotalQuantity;
    } else {
      cart.push({ productId, variantId, quantity });
    }

    // Lưu cookie lại
    res.cookie("cart", JSON.stringify(cart), {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
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
      // Nếu chưa đăng nhập, lấy từ cookie
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

        // Tìm biến thể theo variantId
        const variant = product.variation.find(v => v._id.toString() === item.variantId?.toString());
        if (!variant || !variant.isActive) return null;

        const itemTotal = (variant.salePrice > 0 ? variant.salePrice : variant.regularPrice) * item.quantity;

        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          product: {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            category: product.categoryName,
            brand: product.brandName,
            images: product.image,
            isActive: product.isActive,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          },
          variant,
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
    const { productId, variantId } = req.body;

    if (req.user && req.user._id) {
      // Xử lý với DB cho user đăng nhập
      let cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) return res.status(404).json({ message: "Giỏ hàng không tồn tại" });

      const beforeLength = cart.items.length;
      // Lọc bỏ các sản phẩm cần xóa
      cart.items = cart.items.filter(item => 
        !(item.productId.toString() === productId && item.variantId.toString() === variantId)
      );

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
    cart = cart.filter(item => 
      !(item.productId === productId && item.variantId === variantId)
    );

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
    
    const { productId, variantId, quantity } = req.body;
    
    // Kiểm tra xem sản phẩm có tồn tại và còn hoạt động không
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }
    
    // Tìm biến thể trong product.variation
    const variant = product.variation.find(v => v._id.toString() === variantId);
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
      const index = cart.items.findIndex(item => 
        item.productId.toString() === productId && item.variantId.toString() === variantId
      );

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
    const index = cart.findIndex(item => 
      item.productId === productId && item.variantId === variantId
    );

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

    // Nếu không có cookie cart, không cần đồng bộ
    if (!cookieCart.length) {
      const dbCart = await Cart.findOne({ userId: req.user._id });
      return res.status(200).json({
        message: "Không có dữ liệu cần đồng bộ",
        cart: dbCart ? dbCart.items : [],
      });
    }

    // Lấy giỏ hàng từ DB
    let dbCart = await Cart.findOne({ userId: req.user._id });
    if (!dbCart) {
      dbCart = new Cart({ userId: req.user._id, items: [] });
    }

    const skippedItems = [];

    // Merge từng sản phẩm từ cookie vào DB
    for (const cookieItem of cookieCart) {
      const product = await Product.findById(cookieItem.productId);
      if (!product || !product.isActive) {
        skippedItems.push({
          ...cookieItem,
          reason: "Sản phẩm không tồn tại",
        });
        continue;
      }

      const variant = product.variation.find(v => v._id.toString() === cookieItem.variantId);
      if (!variant || !variant.isActive) {
        skippedItems.push({
          ...cookieItem,
          reason: "Biến thể không tồn tại",
        });
        continue;
      }
      if (variant.stock <= 0) {
        skippedItems.push({
          ...cookieItem,
          reason: "Sản phẩm đã hết hàng",
        });
        continue;
      }

      const index = dbCart.items.findIndex(item => 
        item.productId.toString() === cookieItem.productId && 
        item.variantId.toString() === cookieItem.variantId
      );

      if (index !== -1) {
        const newQuantity = dbCart.items[index].quantity + cookieItem.quantity;
        if (variant.stock < newQuantity) {
          skippedItems.push({
            ...cookieItem,
            reason: "Tổng số lượng vượt quá tồn kho khi đồng bộ",
          });
          continue;
        }
        dbCart.items[index].quantity = newQuantity;
      } else {
        dbCart.items.push({
          productId: cookieItem.productId,
          variantId: cookieItem.variantId,
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
      skippedItems,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};