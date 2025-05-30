// src/controllers/cart.controller.js
import { addToCartSchema } from "../validations/cart.validation"; // Import validation schema
// import { Product } from "../product.fake";

// API thêm sản phẩm vào giỏ hàng
export const addToCart = (req, res) => {
    try {
        const { error } = addToCartSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        
        const { productId, variantId, quantity } = req.body;
    
        // Kiểm tra thông tin sản phẩm và biến thể trong database giả
        const product = Product.findById(productId); // Tìm sản phẩm trong fake DB
        if (!product || product.isActive) {
            return res.status(404).json({ message: "Sản phẩm không tồn tại" });
        }

        // Tìm biến thể của sản phẩm
        const variant = product.variants.find(v => v.variantId === variantId);
        if (!variant) {
            return res.status(404).json({ message: "Biến thể sản phẩm không tồn tại" });
        }

        // Kiểm tra tồn kho
        if (variant.stock < quantity) {
            return res.status(400).json({ message: "Số lượng vượt quá tồn kho" });
        }

        // Kiểm tra giỏ hàng từ cookie
        let cart = req.cookies.cart || [];
        const index = cart.findIndex(item => item.productId === productId && item.variantId === variantId);

        if (index !== -1) {
            // Nếu sản phẩm đã có trong giỏ hàng, cập nhật số lượng
            cart[index].quantity += quantity;
        } else {
            // Nếu chưa có, thêm mới vào giỏ hàng
            cart.push({
                productId,
                variantId,
                quantity,
            });
        }

        // Lưu giỏ hàng vào cookie
        res.cookie("cart", cart, { httpOnly: true,  maxAge: 30 * 24 * 60 * 60 * 1000 });
        return res.status(200).json({ message: "Đã thêm sản phẩm vào giỏ hàng", cart });
        
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

        if (cart.length === 0) {
            return res.status(200).json({
              message: "Giỏ hàng của bạn đang trống",
            });
          }
          

        // Tạo mảng cartDetails để hiển thị chi tiết từng sản phẩm
        const cartDetails = cart.map(item => {
            const product = Product.findById(item.productId);
            const variant = product?.variants?.find(v => v.variantId === item.variantId);

            // Nếu sản phẩm hoặc biến thể bị xóa khỏi DB
            if (!product || !variant) {
                return null;
            }

            const itemTotal = variant.price * item.quantity;

            return {
                productId: item.productId,
                variantId: item.variantId,
                name: product.name,
                image: variant.image,
                color: variant.color,
                size: variant.size,
                price: variant.price,
                quantity: item.quantity,
                itemTotal
            };
        }).filter(Boolean); // Bỏ các phần tử null nếu sản phẩm bị xóa

        // Tính tổng tiền
        const totalAmount = cartDetails.reduce((total, item) => total + item.itemTotal, 0);

        return res.status(200).json({
            cart: cartDetails,
            totalAmount
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


export const removeCart = (req, res) => {
    try {
        const { productId, variantId } = req.body; // Lấy productId và variantId từ request body

        if (!productId) {
            return res.status(400).json({ message: "ID sản phẩm không được để trống" });
        }
        if (!variantId) {
            return res.status(400).json({ message: "ID biến thể không được để trống" });
        }

        // Kiểm tra xem giỏ hàng có tồn tại trong cookie hay không
        let cart = req.cookies.cart || [];

        // Tìm sản phẩm trong giỏ hàng
        const productIndex = cart.findIndex(item => item.productId === productId && item.variantId === variantId);

        if (productIndex === -1) {
            return res.status(404).json({ message: "Sản phẩm không có trong giỏ hàng" });
        }

        // Xóa biến thể khỏi giỏ hàng
        cart.splice(productIndex, 1);

        // Cập nhật lại giỏ hàng vào cookie với thời gian sống là 30 ngày
        res.cookie("cart", cart, { httpOnly: true,  maxAge: 30 * 24 * 60 * 60 * 1000 }); // Cookie tồn tại trong 30 ngày

        return res.status(200).json({ 
            message: "Xóa sản phẩm khỏi giỏ hàng thành công",
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
}


export const updateCartQuantity = (req, res) => {
    try {
        const { error } = addToCartSchema.validate(req.body); // Sử dụng cùng schema Joi để validate dữ liệu
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        
        const { productId, variantId, quantity } = req.body;
        const newQuantity = Number(quantity);

        // Kiểm tra tính hợp lệ của số lượng
        if (newQuantity <= 0) {
            return res.status(400).json({ message: "Số lượng phải lớn hơn 0" });
        }

        // Kiểm tra thông tin sản phẩm và biến thể trong database giả
        const product = Product.findById(productId); // Tìm sản phẩm trong fake DB
        if (!product || product.isActive) {
            return res.status(404).json({ message: "Sản phẩm không tồn tại" });
        }

        // Tìm biến thể của sản phẩm
        const variant = product.variants.find(v => v.variantId === variantId);
        if (!variant) {
            return res.status(404).json({ message: "Biến thể sản phẩm không tồn tại" });
        }

        // Kiểm tra tồn kho
        if (variant.stock < newQuantity) {
            return res.status(400).json({ message: "Số lượng vượt quá tồn kho" });
        }

        // Kiểm tra giỏ hàng từ cookie
        let cart = req.cookies.cart || [];
        const index = cart.findIndex(item => item.productId === productId && item.variantId === variantId);

        if (index === -1) {
            return res.status(404).json({ message: "Sản phẩm không có trong giỏ hàng" });
        }

        // Cập nhật số lượng sản phẩm trong giỏ hàng
        cart[index].quantity = newQuantity;

        // Lưu giỏ hàng đã cập nhật vào cookie, tồn tại trong cookie 30 ngày
        res.cookie("cart", cart, { httpOnly: true,  maxAge: 30 * 24 * 60 * 60 * 1000 });
        
        return res.status(200).json({ message: "Cập nhật giỏ hàng thành công", cart });
        
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};



  



