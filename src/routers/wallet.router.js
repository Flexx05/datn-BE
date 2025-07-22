import express from "express";
import {
  getWalletInfo,
  getWalletTransactions,
  refundOrder,
  cancelOrderRefund,
  createWallet,
} from "../controllers/wallet.controller.js";
import { verifyToken, isAdmin } from "../middlewares/checkAuth.js";

const router = express.Router();

router.post("/wallet", createWallet);

// Lấy thông tin ví của người dùng
router.get("/wallet", verifyToken, getWalletInfo);

// Lấy lịch sử giao dịch của ví
router.get("/wallet/transactions", verifyToken, getWalletTransactions);

// Hoàn tiền đơn hàng (trả hàng)
router.post("/wallet/refund", verifyToken, isAdmin, refundOrder);

// Hoàn tiền khi hủy đơn hàng
router.post("/wallet/cancel-refund", verifyToken, cancelOrderRefund);

export default router;
