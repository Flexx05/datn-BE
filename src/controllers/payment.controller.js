import {
  createPaymentUrl,
  verifyReturnUrl,
  parseOrderIdFromTxnRef,
} from "../utils/vnpay.utils.js";
import paymentModel from "../models/payment.model.js";
import orderModel from "../models/order.model.js";
import { Types } from "mongoose";

// Tạo một yêu cầu thanh toán mới với VNPAY
export const createVnpayPayment = async (req, res) => {
  try {
    const { orderId, bankCode } = req.body;
    const userId = req.user._id;

    console.log("Creating VNPAY payment for order:", orderId);

    if (!Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "ID đơn hàng không hợp lệ",
      });
    }

    // Kiểm tra đơn hàng có tồn tại không
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Kiểm tra đơn hàng thuộc về người dùng hiện tại
    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền thanh toán đơn hàng này",
      });
    }

    // Kiểm tra trạng thái thanh toán
    if (order.paymentStatus !== "Chưa thanh toán") {
      return res.status(400).json({
        message: "Đơn hàng này không thể thanh toán",
        details: `Trạng thái hiện tại: ${order.paymentStatus}`,
      });
    }

    // Kiểm tra xem có payment đang xử lý không
    const existingPayment = await paymentModel.findOne({
      orderId: order._id,
      status: { $in: [0, 1] }, // Đang xử lý hoặc đã thanh toán
    });

    if (existingPayment) {
      return res.status(400).json({
        message: "Đơn hàng này đang trong quá trình thanh toán",
        paymentId: existingPayment._id,
      });
    }

    // Lấy IP của người dùng
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    // Tạo URL thanh toán VNPAY với orderCode và bankCode
    const { paymentUrl, vnpTxnRef } = await createPaymentUrl(
      ipAddr,
      order._id,
      order.totalAmount,
      order.orderCode,
      bankCode
    );

    console.log("Generated payment URL:", paymentUrl);

    // Tạo bản ghi thanh toán mới
    const newPayment = new paymentModel({
      orderId: order._id,
      userId,
      paymentMethod: "VNPAY",
      status: 0,
      amount: order.totalAmount,
      transactionId: vnpTxnRef,
    });

    await newPayment.save();

    // Cập nhật phương thức thanh toán trong đơn hàng
    if (order.paymentMethod !== "VNPAY") {
      order.paymentMethod = "VNPAY";
      await order.save();
    }

    return res.status(200).json({
      message: "Tạo URL thanh toán thành công",
      data: {
        paymentUrl,
        paymentId: newPayment._id,
        transactionId: vnpTxnRef,
      },
    });
  } catch (error) {
    console.error("Create VNPAY Payment Error:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi tạo thanh toán",
      error: error.message,
    });
  }
};

