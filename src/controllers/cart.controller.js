// src/controllers/cart.controller.js
import { addToCartSchema } from "../validations/cart.validation"; // Import validation schema

// API thêm sản phẩm vào giỏ hàng
export const addToCart = (req, res) => {
    try {
        const { error } = addToCartSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        
        const { productId, quantity } = req.body;
    
        // Kiểm tra xem sản phẩm đã có trong giỏ chưa, nếu có thì tăng số lượng, nếu chưa thì thêm mới
        let cart = req.cookies.cart || [];
    
        const index = cart.findIndex((item) => item.productId === productId);
    
        if (index !== -1) {
            // Nếu sản phẩm đã có trong giỏ hàng, cập nhật số lượng
            cart[index].quantity += quantity;
        } else {
            // Nếu chưa có, thêm mới vào giỏ hàng
            cart.push({ productId, quantity });
        }
    
        // Lưu giỏ hàng vào cookie
        res.cookie("cart", cart, { httpOnly: true });
        return res.status(200).json({ message: "Đã thêm vào giỏ hàng", cart });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
        
    }
   
};

// API lấy giỏ hàng
export const getCart = (req, res) => {
    try {
        const cart = req.cookies.cart || [];
        // Tính tổng tiền giỏ hàng (Giả sử mỗi sản phẩm có giá đơn giản là 1000)
        const totalAmount = cart.reduce((total, item) => total + (item.quantity * 1000), 0);
    
        res.status(200).json({ cart, totalAmount });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        })
    }
   
};

export const removeCart = (req, res) => {
    try {
    const { productId } = req.body; // Lấy productId từ request body
  
    // Kiểm tra xem giỏ hàng có tồn tại trong cookie hay không
    let cart = req.cookies.cart || [];
  
    // Tìm sản phẩm trong giỏ hàng
    const productIndex = cart.findIndex(item => item.productId === productId);
  
    if (productIndex === -1) {
      return res.status(404).json({ message: "Không có sản phẩm nào trong giỏ hàng" });
    }
  
    // Xóa sản phẩm khỏi giỏ hàng
    cart.splice(productIndex, 1);
  
    // Cập nhật lại giỏ hàng vào cookie
    res.cookie("cart", cart, { httpOnly: true });
  
    return res.status(200).json({ message: "Xóa khỏi giỏ hàng thành công" });
  
    } catch (error) {
        return res.status(500).json({
            message: error.message
        })
    }
}


export const updateCartQuantity = (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const newQuantity = Number(quantity);

        // Validate dữ liệu đầu vào: số lượng phải là số nguyên dương
        if (!productId || !Number.isInteger(newQuantity) || newQuantity <= 0) {
            return res.status(400).json({ message: "Số lượng phải lớn hơn 0" });
        }

        // Lấy giỏ hàng từ cookie
        let cart = req.cookies.cart || [];

        // Tìm sản phẩm trong giỏ hàng
        const index = cart.findIndex(item => item.productId === productId);

        if (index === -1) {
            return res.status(404).json({ message: "Sản phẩm không tồn tại trong giỏ hàng" });
        }

        // Cập nhật số lượng sản phẩm
        cart[index].quantity = newQuantity;

        // Cập nhật lại giỏ hàng trong cookie
        res.cookie("cart", cart, { httpOnly: true });

        return res.status(200).json({
            message: "Cập nhập giỏ hàng thành công",
            cart
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};


  



