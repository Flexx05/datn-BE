import { Router } from "express";
import { isAdmin, isAdmin, isAdminOrStaff, verifyToken } from "../middlewares/checkAuth.js";
import {
    createOrder,
    getAllOrders,
    getOrderById,
    getOrderByUserId,
    getOrderByUserIdForAdminOrStaff,
    updateOrderStatus,
    updatePaymentStatus
} from "../controllers/order.controller.js";

const router = Router();

router.post("/order", createOrder);
router.get("/order", verifyToken, isAdminOrStaff, getAllOrders);
router.get("/order/user", verifyToken, getOrderByUserId);
router.get("/order/:id", verifyToken, getOrderById);
router.patch("/order/status/:id", verifyToken, updateOrderStatus);
router.get("/order/user/:userId", verifyToken, isAdminOrStaff, getOrderByUserIdForAdminOrStaff);
router.get("/order/id/:id", verifyToken, getOrderById);
router.patch("/order/:id", verifyToken, isAdmin, updateOrderStatus);

export default router;
