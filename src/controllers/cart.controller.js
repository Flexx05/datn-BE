import { addToCartSchema } from "../validations/cart.validation";
import Product from "../models/product.model"; 

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
  
  

