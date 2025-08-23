import {
  createPaymentUrl,
  verifyReturnUrl,
  parseOrderIdFromTxnRef,
} from "../utils/vnpay.utils.js";
import paymentModel from "../models/payment.model.js";
import orderModel from "../models/order.model.js";
import { Types } from "mongoose";
import { getSocketInstance } from "../socket.js";

// Tạo một yêu cầu thanh toán mới với VNPAY
export const createVnpayPayment = async (req, res) => {
  try {
    const { orderId, bankCode } = req.body;
    // const userId = req.user._id;

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
    // if (order.userId.toString() !== userId.toString()) {
    //   return res.status(403).json({
    //     message: "Bạn không có quyền thanh toán đơn hàng này",
    //   });
    // }

    // Kiểm tra trạng thái thanh toán
    if (order.paymentStatus !== 0) {
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
      // userId,
      paymentMethod: "VNPAY",
      status: 0,
      amount: order.totalAmount,
      transactionId: vnpTxnRef,
      paymentUrl,
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
    const isValidSignature = verifyReturnUrl(vnpParams);

    if (!isValidSignature) {
      return res.status(400).send("Chữ ký không hợp lệ");
    }

    const vnp_ResponseCode = vnpParams.vnp_ResponseCode;
    const vnp_TxnRef = vnpParams.vnp_TxnRef;

    // Tìm thông tin thanh toán
    const payment = await paymentModel.findOne({ transactionId: vnp_TxnRef });
    if (!payment) {
      return res.status(404).send("Không tìm thấy thông tin thanh toán");
    }
    const order = await orderModel.findById(payment.orderId);
    if (order.status === 5) {
      return res.status(400).send("Đơn hàng đã bị hủy, không thể thanh toán");
    }

    // Lưu lại dữ liệu trả về từ VNPAY
    payment.responseData = vnpParams;

    if (vnp_ResponseCode === "00") {
      // Thanh toán thành công
      payment.status = 1;
      await payment.save();

      // Cập nhật trạng thái đơn hàng
      const updatedOrder = await orderModel.findByIdAndUpdate(
        payment.orderId,
        // { paymentStatus: 1, status: 0, updatedAt: new Date() },
        {
          $set: {
            paymentStatus: 1,
            status: 0,
            updatedAt: new Date(),
          },
          $push: {
            paymentStatusHistory: {
              paymentStatus: 1,
              updatedByUser: req.user?._id || null,
              updatedByType: req.user ? "user" : "guest",
              note: "Thanh toán thành công qua VNPAY",
            },
          },
        },
        { new: true }
      );
      // Realtime cập nhật trạng thái thanh toán
      const io = getSocketInstance();
      if (io) {
        io.to("admin").emit("payment-updated", {
          order: updatedOrder?._id,
          paymentStatus: updatedOrder?.paymentStatus,
        });
      }

      // Lấy orderCode để redirect
      const orderCode = updatedOrder?.orderCode || payment.orderId;

      // Redirect về trang xác nhận đơn hàng trên frontend
      return res.redirect(302, `http://localhost:5173/user/order`);
    } else {
      // Thanh toán thất bại, chuyển hướng về trang thất bại (nếu có)
      return res.redirect(302, `http://localhost:5173/`);
    }
  } catch (error) {
    console.error("VNPAY Callback Error:", error);
    // Lỗi hệ thống, redirect về trang lỗi tổng quát
    return res.redirect(302, `http://localhost:5173/order/error`);
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
    // if (order.userId.toString() !== userId.toString()) {
    //   return res.status(403).json({
    //     message: "Bạn không có quyền truy cập đơn hàng này",
    //   });
    // }

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
        paymentUrl: payment.paymentUrl,
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
      // {
      //   paymentStatus: "refunded",
      // },
      {
        $set: {
          paymentStatus: 2,
        },
        $push: {
          paymentStatusHistory: {
            paymentStatus: 2,
            updatedByUser: req.user?._id || null,
            updatedByType: req.user ? "user" : "guest",
            note: "Hoàn tiền thành công",
          },
        },
      },
      { new: true }
    ); //////////////////////////////////////////

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
