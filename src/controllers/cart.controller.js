import { addToCartSchema } from "../validations/cart.validation";
import Product from "../models/product.model"; 

// API thêm sản phẩm vào giỏ hàng
// API thêm sản phẩm vào giỏ hàng
export const addToCart = async (req, res) => {
  try {
    const { error } = addToCartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { productId, variantAttributes, quantity } = req.body;

    // Đảm bảo variantAttributes là mảng
    const variantAttrs = Array.isArray(variantAttributes) ? variantAttributes : [];


    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }

    if(quantity <= 0) {
      return res.status(400).json({ message: "Số lượng phải lớn hơn 0" });
    }                  
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

    let cart = [];
    if (req.cookies.cart) {
      try {
        cart = JSON.parse(req.cookies.cart);
      } catch {
        cart = [];
      }
    }

    const index = cart.findIndex(item => {
      if (item.productId !== productId) return false;
      if (!Array.isArray(item.variantAttributes)) return false;

      return variantAttrs.every(attrReq => {
        const attrInCart = item.variantAttributes.find(attrCart => attrCart.attributeName === attrReq.attributeName);
        return attrInCart && attrInCart.value === attrReq.value;
      });
    });

    if (index !== -1) {
      cart[index].quantity += quantity;
    } else {
      cart.push({ productId, variantAttributes: [...variantAttrs], quantity });
    }

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
      // Lấy dữ liệu giỏ hàng từ cookie và parse JSON
      let cart = [];
      if (req.cookies.cart) {
        try {
          cart = JSON.parse(req.cookies.cart);
        } catch (err) {
          cart = [];
        }
      }
  
      // Nếu giỏ trống, trả về thông báo
      if (cart.length === 0) {
        return res.status(200).json({ message: "Giỏ hàng của bạn đang trống" });
      }
  
      // Duyệt qua từng sản phẩm trong giỏ để lấy thông tin chi tiết
      const cartDetails = await Promise.all(
        cart.map(async (item) => {
          const product = await Product.findById(item.productId);
          if (!product || !product.isActive) return null;
  
          // Tìm biến thể chính xác theo variantAttributes
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
  
          // Tính tổng tiền cho item
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
  
      // Loại bỏ các phần tử null (những sản phẩm không còn hợp lệ)
      const filteredCart = cartDetails.filter(Boolean);

      if (filteredCart.length === 0) {
        return res.status(200).json({ message: "Giỏ hàng của bạn đang trống" });
      }
  
      // Tính tổng tiền tất cả sản phẩm
      const totalAmount = filteredCart.reduce((sum, item) => sum + item.itemTotal, 0);
  
      return res.status(200).json({ cart: filteredCart, totalAmount });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };
  
  

  export const removeCart = async (req, res) => {
    try {
      const { productId, variantAttributes } = req.body;
  
      // Đảm bảo variantAttributes là mảng
      const variantAttrs = Array.isArray(variantAttributes) ? variantAttributes : [];
  
      let cart = [];
      if (req.cookies.cart) {
        try {
          cart = JSON.parse(req.cookies.cart);
        } catch {
          cart = [];
        }
      }
  
      const exists = cart.some(item => {
        if (item.productId !== productId) return false;
  
        const itemAttrs = Array.isArray(item.variantAttributes) ? item.variantAttributes : [];
  
        if (!itemAttrs.length && !variantAttrs.length) return true;
        if (!itemAttrs.length || !variantAttrs.length || itemAttrs.length !== variantAttrs.length) return false;
  
        return variantAttrs.every(attrReq => {
          const attrInCart = itemAttrs.find(attrCart => attrCart.attributeName === attrReq.attributeName);
          return attrInCart && attrInCart.value === attrReq.value;
        });
      });
  
      if (!exists) {
        return res.status(404).json({ message: "Sản phẩm cần xóa không tồn tại trong giỏ hàng" });
      }
  
      const filteredCart = cart.filter(item => {
        if (item.productId !== productId) return true;
  
        const itemAttrs = Array.isArray(item.variantAttributes) ? item.variantAttributes : [];
  
        if (!itemAttrs.length && !variantAttrs.length) return false;
        if (!itemAttrs.length || !variantAttrs.length || itemAttrs.length !== variantAttrs.length) return true;
  
        const isMatch = variantAttrs.every(attrReq => {
          const attrInCart = itemAttrs.find(attrCart => attrCart.attributeName === attrReq.attributeName);
          return attrInCart && attrInCart.value === attrReq.value;
        });
  
        return !isMatch;
      });
  
      res.cookie("cart", JSON.stringify(filteredCart), {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
  
      return res.status(200).json({ message: "Đã xóa sản phẩm khỏi giỏ hàng" });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
};
  
  
export const updateCartQuantity = async (req, res) => {
  try {
    const { error } = addToCartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { productId, variantAttributes, quantity } = req.body;
    const variantAttrs = Array.isArray(variantAttributes) ? variantAttributes : [];

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }

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

    let cart = [];
    if (req.cookies.cart) {
      try {
        cart = JSON.parse(req.cookies.cart);
      } catch {
        cart = [];
      }
    }

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

    if (quantity === 0) {
      // Xóa sản phẩm khỏi giỏ hàng nếu số lượng là 0
      cart.splice(index, 1);
    } else {
      // Cập nhật số lượng
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