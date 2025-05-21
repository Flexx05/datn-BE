import express from "express";
import {
  createVnpayPayment,
  vnpayCallback,
  getPaymentStatus,

} from "../controllers/payment.controller.js";
import { verifyToken } from "../middlewares/checkAuth.js";

const router = express.Router();

// Routes cho người dùng
router.post("/payment/vnpay/create", verifyToken, createVnpayPayment);
router.get("/payment/vnpay/callback", verifyToken, vnpayCallback);
router.get("/payment/status/:orderId", verifyToken, getPaymentStatus);
router.get("/payment/history", verifyToken, getUserPaymentHistory);


export default router;
