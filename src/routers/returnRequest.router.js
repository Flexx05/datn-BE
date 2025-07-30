import express from "express";
import {
  createReturnRequest,
  getReturnRequestById,
  getReturnRequests,
  updateReturnRequestStatus,
  processRefundForReturnRequest,
  getReturnRequestByOrderId,
  getReturnRequestByOrderCode,
} from "../controllers/returnRequest.controller.js";
import { verifyToken, isAdmin } from "../middlewares/checkAuth.js";

const router = express.Router();

// Tạo yêu cầu hoàn hàng mới
router.post("/return-requests", verifyToken, createReturnRequest);

// Lấy chi tiết yêu cầu hoàn hàng theo ID
router.get("/return-requests/:id", verifyToken, getReturnRequestById);
router.get("/return-requests/order/:orderId", verifyToken, getReturnRequestByOrderId);
router.get("/return-requests/order-code/:orderCode", getReturnRequestByOrderCode);

// Lấy danh sách yêu cầu hoàn hàng
router.get("/return-requests", verifyToken, getReturnRequests);

// Cập nhật trạng thái yêu cầu hoàn hàng
router.patch("/return-requests/:id/status", verifyToken, isAdmin, updateReturnRequestStatus);

// Xử lý hoàn tiền cho yêu cầu hoàn hàng
router.post("/return-requests/:id/refund", verifyToken, isAdmin, processRefundForReturnRequest);

export default router;
