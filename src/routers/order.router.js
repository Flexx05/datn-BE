import { Router } from "express";
import { isAdmin, isAdmin, isAdminOrStaff, verifyToken } from "../middlewares/checkAuth.js";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrderByUserId,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
  updateOrderTotal,
  getOrderByCode,
} from "../controllers/order.controller.js";

const router = Router();

router.post("/order", createOrder); 
router.get("/order", verifyToken, isAdminOrStaff,getAllOrders); 
router.get("/order/user/id/:id", verifyToken, getOrderByUserId); 
router.get("/order/id/:id", getOrderById); 
router.get("/orders/code/:code", getOrderByCode);
router.patch("/order/status/:id", verifyToken,updateOrderStatus);
router.patch("/order/payment-status/:id", updatePaymentStatus);
router.patch("/order/cancel/:id", cancelOrder);
router.patch("/order/update-total/:id", updateOrderTotal); 

export default router;
 