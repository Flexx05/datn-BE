import express from "express";
import {
  getWalletInfo,
  getWalletTransactions,
  refundOrder,
  cancelOrderRefund,
  createWallet,
  payOrderWithWallet,
} from "../controllers/wallet.controller.js";
import { verifyToken, isAdmin } from "../middlewares/checkAuth.js";

const router = express.Router();

// Tạo ví cho người dùng
router.post("/wallet", createWallet);

// Lấy thông tin ví của người dùng
router.get("/wallet", verifyToken, getWalletInfo);

// Lấy lịch sử giao dịch của ví
router.get("/wallet/transactions", verifyToken, getWalletTransactions);

// Hoàn tiền đơn hàng (trả hàng) - Yêu cầu admin
router.post("/wallet/refund", verifyToken, isAdmin, refundOrder);

// Hoàn tiền khi hủy đơn hàng
router.post("/wallet/cancel-refund", verifyToken, cancelOrderRefund);

// Thanh toán đơn hàng bằng ví
router.post("/wallet/pay", verifyToken, payOrderWithWallet);

export default router;