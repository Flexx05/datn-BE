// src/middlewares/cart.middleware.js

// Middleware kiểm tra giỏ hàng tồn tại trong cookie
export const checkCartInCookie = (req, res, next) => {
    const cart = req.cookies.cart;
    if (!cart) {
        return res.status(404).json({ message: "Giỏ hàng không tồn tại" });
    }
    next();
};

// Middleware kiểm tra sự tồn tại của sản phẩm trong giỏ hàng
export const checkProductInCart = (req, res, next) => {
    const { productId } = req.body;
    const cart = req.cookies.cart || [];
    const productIndex = cart.findIndex(item => item.productId === productId);

    if (productIndex === -1) {
        return res.status(404).json({ message: "Không có sản phẩm nào trong giỏ hàng" });
    }

    next();
};
