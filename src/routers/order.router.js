import { Router } from "express";
import { isAdmin, isAdmin, isAdminOrStaff, verifyToken, verifyTokenByEmail } from "../middlewares/checkAuth.js";
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
  LookUpOrder,
  updateStatusOrderItem,
  updateReturnOrder
} from "../controllers/order.controller.js";

const router = Router();

router.post("/order", createOrder); 
router.get("/order", verifyToken, isAdminOrStaff,getAllOrders); 
router.get("/order/user/id/:id", verifyToken, getOrderByUserId); 
router.get("/order/id/:id", getOrderById); 
router.get("/orders/code/:code", getOrderByCode);
router.get("/order/lookup", verifyTokenByEmail, LookUpOrder);
router.patch("/order/status/:id", verifyToken,updateOrderStatus);
router.patch("/order/payment-status/:id", updatePaymentStatus);
router.patch("/order/cancel/:id", cancelOrder);
router.patch("/order/update-total/:id", updateOrderTotal); 
router.patch("/order/update-item-status/:id", verifyToken, updateStatusOrderItem);
router.patch("/order/update-return-order/:id",verifyToken, updateReturnOrder);

export default router;
 