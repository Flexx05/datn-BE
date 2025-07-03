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
    getShippingFee
} from "../controllers/order.controller.js";

const router = Router();

router.post("/order", createOrder); // ai cũng đặt hàng được
router.get("/order",getAllOrders); // chỉ admin hoặc nhân viên mới xem được tất cả đơn hàng
router.get("/order/user", getOrderByUserId); // người dùng có thể xem tất cả đơn hàng của mình
router.get("/order/id/:id", getOrderById); // người dùng có thể xem đơn hàng của mình, admin hoặc nhân viên có thể xem đơn hàng theo id
router.patch("/order/status/:id",updateOrderStatus);
router.patch("/order/payment-status/:id", updatePaymentStatus); // chỉ admin mới có thể cập nhật trạng thái thanh toán của đơn hàng (dành cho COD và các đơn có khiếu nại), chưa làm: hệ thống sẽ tự động cập nhật trạng thái đơn hàng khi thanh toán online thành công hoặc khi hoàn tiền thành công
router.patch("/order/cancel/:id", cancelOrder);  // người dùng có thể hủy đơn hàng của mình, admin hoặc nhân viên có thể hủy đơn hàng của người khác
router.get("/order/shippingFee", getShippingFee); // lấy phí ship (bên client truyền vào địa chỉ giao hàng, ex: {"shippingAddress": "Hà Nội"})

export default router;
 