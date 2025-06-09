import express from "express";
import {
    getOrders,
    getOrderById,
    updateOrderStatus,
} from "../controllers/order.controller.js";
import { verifyToken } from "../middlewares/checkAuth.js";

const router = express.Router();


// Routes cho cả user và admin
router.get("/order", verifyToken, getOrders); // Lấy danh sách đơn hàng (phân quyền trong controller)
router.get("/order/:id", verifyToken, getOrderById); // Xem chi tiết đơn hàng (phân quyền trong controller)

// Routes chỉ dành cho admin và staff
router.patch("/order/status/:id", verifyToken, updateOrderStatus); // Cập nhật trạng thái đơn hàng


export default router;
