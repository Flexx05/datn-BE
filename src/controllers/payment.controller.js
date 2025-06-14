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

// Xử lý callback từ VNPAY
export const vnpayCallback = async (req, res) => {
  try {
    const vnpParams = req.query;
    console.log("VNPAY Callback Params:", vnpParams);

    // Kiểm tra chữ ký VNPAY
    const isValidSignature = verifyReturnUrl(vnpParams);

    if (!isValidSignature) {
      console.log("Invalid VNPAY signature");
      return res.status(400).json({
        message: "Chữ ký không hợp lệ",
      });
    }

    // Kiểm tra kết quả giao dịch từ VNPAY
    const vnp_ResponseCode = vnpParams.vnp_ResponseCode;
    const vnp_TxnRef = vnpParams.vnp_TxnRef;
    const vnp_Amount = vnpParams.vnp_Amount;

    // Lấy orderId từ mã giao dịch
    const orderId = vnp_TxnRef;
    console.log("OrderID from transaction:", orderId);

    if (!orderId) {
      return res.status(400).json({
        message: "Không thể xác định đơn hàng",
        params: vnpParams,
      });
    }

    // Tìm thông tin thanh toán
    const payment = await paymentModel.findOne({ transactionId: vnp_TxnRef });

    if (!payment) {
      console.log("Payment not found for transaction:", vnp_TxnRef);
      return res.status(404).json({
        message: "Không tìm thấy thông tin thanh toán",
      });
    }

    // Lưu trữ toàn bộ dữ liệu phản hồi từ VNPAY
    payment.responseData = vnpParams;

    // Xử lý kết quả thanh toán
    if (vnp_ResponseCode === "00") {
      try {
        // Cập nhật trạng thái thanh toán
        payment.status = 1; // Đã thanh toán
        await payment.save();

        // Cập nhật trạng thái đơn hàng
        const updatedOrder = await orderModel.findByIdAndUpdate(
          payment.orderId,
          {
            paymentStatus: "Đã thanh toán",
            status: "Đang xử lý", // Cập nhật trạng thái đơn hàng
            updatedAt: new Date(),
          },
          { new: true }
        );

        if (!updatedOrder) {
          console.log("Order not found for ID:", payment.orderId);
          throw new Error("Không tìm thấy đơn hàng để cập nhật");
        }

        console.log("Payment successful, order updated:", updatedOrder._id);

        // Chuyển hướng hoặc trả về kết quả thành công
        return res.status(200).json({
          message: "Thanh toán thành công",
          data: {
            orderId: payment.orderId,
            paymentId: payment._id,
            transactionId: vnp_TxnRef,
            amount: vnp_Amount / 100, // Chuyển đổi về đơn vị tiền tệ gốc
            orderStatus: updatedOrder.status,
          },
        });
      } catch (error) {
        console.error("Error updating order status:", error);
        // Vẫn trả về thành công cho VNPAY nhưng ghi log lỗi
        return res.status(200).json({
          message:
            "Ghi nhận thanh toán thành công, nhưng có lỗi khi cập nhật đơn hàng",
          error: error.message,
        });
      }
    } else {
      // Thanh toán thất bại
      try {
        payment.status = 2; // Thanh toán thất bại
        await payment.save();

        // Cập nhật trạng thái đơn hàng
        await orderModel.findByIdAndUpdate(payment.orderId, {
          paymentStatus: "Thanh toán thất bại",
          updatedAt: new Date(),
        });

        console.log("Payment failed for order:", payment.orderId);

        return res.status(400).json({
          message: "Thanh toán thất bại",
          data: {
            orderId: payment.orderId,
            paymentId: payment._id,
            responseCode: vnp_ResponseCode,
            transactionId: vnp_TxnRef,
          },
        });
      } catch (error) {
        console.error("Error updating failed payment status:", error);
        return res.status(500).json({
          message: "Lỗi khi cập nhật trạng thái thanh toán thất bại",
          error: error.message,
        });
      }
    }
  } catch (error) {
    console.error("VNPAY Callback Error:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi xử lý callback từ VNPAY",
      error: error.message,
    });
  }
};

// Lấy trạng thái thanh toán của đơn hàng
export const getPaymentStatus = async (req, res) => {
  try {
    console.log(req.params);

    const { orderId } = req.params;
    const userId = req.user._id;

    // Kiểm tra đơn hàng tồn tại
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Kiểm tra quyền truy cập đơn hàng
    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập đơn hàng này",
      });
    }

    // Tìm thông tin thanh toán
    const payment = await paymentModel.findOne({ orderId });

    if (!payment) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin thanh toán",
      });
    }

    // Trả về thông tin thanh toán
    return res.status(200).json({
      message: "Lấy thông tin thanh toán thành công",
      data: {
        paymentId: payment._id,
        orderId: payment.orderId,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error("Get Payment Status Error:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi lấy thông tin thanh toán",
      error: error.message,
    });
  }
};

// Lấy lịch sử thanh toán của người dùng
export const getUserPaymentHistory = async (req, res) => {
  try {
    console.log(req.user);

    const userId = req.user._id;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Tính toán số lượng bản ghi để bỏ qua (skip)
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Truy vấn lịch sử thanh toán
    const payments = await paymentModel
      .find({ userId })
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: "orderId",
        select: "orderCode totalAmount status createdAt",
      });

    // Đếm tổng số bản ghi
    const total = await paymentModel.countDocuments({ userId });

    return res.status(200).json({
      message: "Lấy lịch sử thanh toán thành công",
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get Payment History Error:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi lấy lịch sử thanh toán",
      error: error.message,
    });
  }
};

// Admin: Lấy tất cả giao dịch thanh toán
export const getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      status,
      paymentMethod,
      search,
    } = req.query;

    // Xây dựng điều kiện tìm kiếm
    const query = {};

    // Lọc theo trạng thái nếu có
    if (status !== undefined) {
      query.status = parseInt(status);
    }

    // Lọc theo phương thức thanh toán
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Tìm kiếm theo order ID hoặc transaction ID
    if (search) {
      if (Types.ObjectId.isValid(search)) {
        query.$or = [{ orderId: new Types.ObjectId(search) }];
      } else {
        query.$or = [{ transactionId: { $regex: search, $options: "i" } }];
      }
    }

    // Tính toán số lượng bản ghi để bỏ qua (skip)
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Thực hiện truy vấn với điều kiện lọc và phân trang
    const payments = await paymentModel
      .find(query)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: "userId",
        select: "fullName email",
      })
      .populate({
        path: "orderId",
        select: "orderCode totalAmount status createdAt",
      });

    // Đếm tổng số bản ghi thỏa mãn điều kiện
    const total = await paymentModel.countDocuments(query);

    return res.status(200).json({
      message: "Lấy danh sách thanh toán thành công",
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get All Payments Error:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi lấy danh sách thanh toán",
      error: error.message,
    });
  }
};

// Admin: Xử lý hoàn tiền
export const refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Tìm thông tin thanh toán
    const payment = await paymentModel.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin thanh toán",
      });
    }

    // Kiểm tra trạng thái thanh toán
    if (payment.status !== 1) {
      // Chỉ hoàn tiền cho thanh toán đã thành công
      return res.status(400).json({
        message:
          "Chỉ có thể hoàn tiền cho các giao dịch đã thanh toán thành công",
      });
    }

    // Cập nhật trạng thái thanh toán
    payment.status = 3; // Đã hoàn tiền
    await payment.save();

    // Cập nhật trạng thái đơn hàng
    await orderModel.findByIdAndUpdate(
      payment.orderId,
      {
        paymentStatus: "refunded",
      },
      { new: true }
    );

    // Ghi chú: Trong thực tế, bạn cần thực hiện các bước hoàn tiền thông qua API của VNPAY
    // Đây chỉ là cập nhật trạng thái trong hệ thống của bạn

    return res.status(200).json({
      message: "Hoàn tiền thành công",
      data: {
        paymentId: payment._id,
        orderId: payment.orderId,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error("Refund Payment Error:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi xử lý hoàn tiền",
      error: error.message,
    });
  }
};
