import express from "express";
import {
  createVnpayPayment,
  vnpayCallback,
} from "../controllers/payment.controller.js";
import { verifyToken } from "../middlewares/checkAuth.js";

const router = express.Router();

// Routes cho người dùng
router.post("/payment/vnpay/create", verifyToken, createVnpayPayment);
router.get("/payment/vnpay/callback", verifyToken, vnpayCallback);

export default router;
