import {Router} from "express";
import { addToCart, getCart, removeCart, updateCartQuantity } from "../controllers/cart.controller";
import { checkCartInCookie, checkProductInCart } from "../middlewares/checkCart";

const router = Router();

// Thêm sản phẩm vào giỏ hàng
router.post("/cart", addToCart);
// Hiển thị danh sách sản phẩm trong danh mục
router.get("/cart", checkCartInCookie ,getCart);
// Xóa sản phẩm có trong danh mục
router.post("/cart/remove", checkCartInCookie, removeCart);
// Cập nhập số lượng sản phẩm trong giỏ hàng
router.patch("/cart/update", updateCartQuantity);
export default router;