import express from "express";
import {
  createVnpayPayment,
  vnpayCallback,
  getPaymentStatus,
  getUserPaymentHistory,
  getAllPayments,
  refundPayment,
} from "../controllers/payment.controller.js";
import { verifyToken } from "../middlewares/checkAuth.js";

const router = express.Router(); 

// Routes cho người dùng
router.post("/payment/vnpay/create", createVnpayPayment);
router.get("/payment/vnpay/callback", vnpayCallback);
router.get("/payment/status/:orderId", verifyToken, getPaymentStatus);
router.get("/payment/history", verifyToken, getUserPaymentHistory);

// Routes cho admin
router.get("/admin/payments", verifyToken, getAllPayments);
router.patch("/admin/payments/:paymentId/refund", verifyToken, refundPayment);

export default router;
