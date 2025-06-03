import {Router} from "express";
import { addToCart, getCart, removeCart, syncCart, updateCartQuantity } from "../controllers/cart.controller";
import { checkCartAuth } from "../middlewares/checkCart";


const router = Router();

// Thêm sản phẩm vào giỏ hàng
router.post("/cart",checkCartAuth ,addToCart);
// Lấy danh sách sản phẩm trong giỏ hàng
router.get("/cart", checkCartAuth ,getCart);
// Xóa sản phẩm có trong danh mục
router.post("/cart/remove", checkCartAuth ,removeCart);
// Cập nhập số lượng sản phẩm trong giỏ hàng
router.patch("/cart/update",checkCartAuth ,updateCartQuantity);
export default router;