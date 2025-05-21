import express from "express";
import {
  createVnpayPayment,

} from "../controllers/payment.controller.js";
import { verifyToken } from "../middlewares/checkAuth.js";

const router = express.Router();

// Routes cho người dùng
router.post("/payment/vnpay/create", verifyToken, createVnpayPayment);


export default router;
