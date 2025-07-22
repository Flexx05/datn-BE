import mongoose from "mongoose";
import { ReturnRequest } from "../models/returnRequest.model.js";
import { Wallet } from "../models/wallet.model.js";
import { Order } from "../models/order.model.js";
import { paymentModel as Payment } from "../models/payment.model.js";

// Tạo yêu cầu hoàn hàng mới
export const createReturnRequest = async (req, res) => {
  const { orderId, reason, products, refundAmount, notes } = req.body;
  const userId = req.user._id.toString(); // Lấy userId từ JWT token

  // Validate input
    if (!orderId || !reason || !products || !refundAmount) {
      return res.status(400).json({ message: "Thiếu các trường bắt buộc" });
    }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Kiểm tra đơn hàng
    const order = await Order.findOne({ _id: orderId, userId }).session(
      session
    );
    if (!order) {
      throw new Error(
        "Đơn hàng không tồn tại hoặc không thuộc về người dùng này"
      );
    }

    if (order.paymentStatus !== 1 || order.status !== 3) {
      throw new Error("Đơn hàng chưa được thanh toán hoặc chưa giao");
    }

    // Kiểm tra tổng số tiền hoàn lại
    const calculatedRefund = products.reduce(
      (sum, p) => sum + p.quantity * p.price,
      0
    );
    if (calculatedRefund !== refundAmount) {
      throw new Error("Số tiền hoàn lại không khớp với danh sách sản phẩm");
    }

    if (refundAmount > order.totalAmount) {
      throw new Error("Số tiền hoàn lại vượt quá tổng tiền đơn hàng");
    }

    // Tạo yêu cầu hoàn hàng
    const returnRequest = await ReturnRequest.create(
      [
        {
          orderId,
          reason,
          status: 0,
          products,
          refundAmount,
          notes,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return res.status(201).json({
      message: "Tạo yêu cầu hoàn hàng thành công",
      data: returnRequest[0],
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Create Return Request Error:", error);
    return res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Lấy chi tiết yêu cầu hoàn hàng theo ID
export const getReturnRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString(); // Lấy userId từ JWT token

    const returnRequest = await ReturnRequest.findById(id)
      .populate("orderId", "orderCode totalAmount")
      .select("-__v");

    if (!returnRequest) {
      return res
        .status(404)
        .json({ message: "Yêu cầu hoàn hàng không tồn tại" });
    }

    // Kiểm tra quyền truy cập
    const order = await Order.findById(returnRequest.orderId);
    if (order.userId.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    return res.status(200).json({
      message: "Lấy thông tin yêu cầu hoàn hàng thành công",
      data: returnRequest,
    });
  } catch (error) {
    console.error("Get Return Request By ID Error:", error);
    return res.status(400).json({ message: error.message });
  }
};
export const getReturnRequestByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id.toString(); // Lấy userId từ JWT token

    const returnRequest = await ReturnRequest.findOne({ orderId })
      .populate("orderId", "orderCode totalAmount")
      .select("-__v");

    if (!returnRequest) {
      return res
        .status(404)
        .json({ message: "Yêu cầu hoàn hàng không tồn tại" });
    }

    // Kiểm tra quyền truy cập
    const order = await Order.findById(returnRequest.orderId);
    if (order.userId.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    return res.status(200).json({
      message: "Lấy thông tin yêu cầu hoàn hàng thành công",
      data: returnRequest,
    });
  } catch (error) {
    console.error("Get Return Request By ID Error:", error);
    return res.status(400).json({ message: error.message });
  }
};

// Lấy danh sách yêu cầu hoàn hàng
export const getReturnRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      search = "",
      status = "",
    } = req.query;
    const userId = req.user._id.toString(); // Lấy userId từ JWT token

    // Tạo query
    const query =
      req.user.role === "admin" ? {} : { "customerInfo._id": userId };
    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: "i" } },
        { "customerInfo.name": { $regex: search, $options: "i" } },
        { "customerInfo.phone": { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const returnRequests = await ReturnRequest.find(query)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("orderId", "orderCode totalAmount")

    const total = await ReturnRequest.countDocuments(query);

    return res.status(200).json({
      message: "Lấy danh sách yêu cầu hoàn hàng thành công",
      data: {
        returnRequests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get Return Requests Error:", error);
    return res.status(400).json({ message: error.message });
  }
};

// Cập nhật trạng thái yêu cầu hoàn hàng
export const updateReturnRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user._id.toString(); // Lấy userId từ JWT token

  // Validate input
  if (
    !status ||
    ![0, 1, 2, 3, 4].includes(status)
  ) {
    return res.status(400).json({ message: "Trạng thái không hợp lệ" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Kiểm tra quyền admin
    if (req.user.role !== "admin") {
      throw new Error("Chỉ admin mới có thể cập nhật trạng thái");
    }

    // Kiểm tra yêu cầu hoàn hàng
    const returnRequest = await ReturnRequest.findById(id).session(session);
    if (!returnRequest) {
      throw new Error("Yêu cầu hoàn hàng không tồn tại");
    }

    // Cập nhật trạng thái và processedBy
    await ReturnRequest.updateOne(
      { _id: id },
      { status},
      // { status, processedBy: userId },
      { session }
    );

    await session.commitTransaction();
    return res.status(200).json({
      message: "Cập nhật trạng thái yêu cầu hoàn hàng thành công",
      data: { id, status },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Update Return Request Status Error:", error);
    return res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Xử lý hoàn tiền cho yêu cầu hoàn hàng
export const processRefundForReturnRequest = async (req, res) => {
  const { returnRequestId } = req.body;
  const userId = req.user._id.toString(); // Lấy userId từ JWT token

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Kiểm tra quyền admin
    if (req.user.role !== "admin") {
      throw new Error("Chỉ admin mới có thể xử lý hoàn tiền");
    }

    // Kiểm tra yêu cầu hoàn hàng
    const returnRequest = await ReturnRequest.findById(returnRequestId)
      .populate("orderId")
      .session(session);
    if (!returnRequest) {
      throw new Error("Yêu cầu hoàn hàng không tồn tại");
    }

    if (returnRequest.status !== "APPROVED") {
      throw new Error("Yêu cầu hoàn hàng chưa được duyệt");
    }

    const order = await Order.findById(returnRequest.orderId).session(session);
    if (!order || order.paymentStatus !== 1) {
      throw new Error("Đơn hàng không hợp lệ hoặc chưa được thanh toán");
    }

    // Kiểm tra ví của người dùng
    const wallet = await Wallet.findOne({
      userId: order.userId,
      status: 0,
    }).session(session);
    if (!wallet) {
      throw new Error("Ví không tồn tại hoặc bị khóa");
    }

    // Kiểm tra payment
    const payment = await Payment.findOne({
      orderId: order._id,
      userId: order.userId,
      status: 1, // Đã thanh toán
    }).session(session);
    if (!payment) {
      throw new Error("Không tìm thấy thông tin thanh toán hợp lệ");
    }

    // Tạo giao dịch hoàn tiền
    const transaction = await Transaction.create(
      [
        {
          walletId: wallet._id,
          orderId: order._id,
          type: "refund",
          amount: returnRequest.refundAmount,
          status: 1, // Thành công
          description: `Hoàn tiền yêu cầu hoàn hàng #${order.orderCode}`,
        },
      ],
      { session }
    );

    // Cập nhật ví, đơn hàng, payment và yêu cầu hoàn hàng
    await Wallet.updateOne(
      { _id: wallet._id },
      {
        $inc: { balance: returnRequest.refundAmount },
        $push: { transactions: transaction[0]._id },
      },
      { session }
    );

    await Order.updateOne(
      { _id: order._id },
      {
        paymentStatus: 2, // Hoàn tiền
        transactionId: transaction[0]._id,
      },
      { session }
    );

    await Payment.updateOne(
      { orderId: order._id },
      { status: 3 }, // Đã hoàn tiền
      { session }
    );

    await ReturnRequest.updateOne(
      { _id: returnRequestId },
      { status: "REFUNDED" },
      { session }
    );

    await session.commitTransaction();
    return res.status(200).json({
      message: "Hoàn tiền yêu cầu hoàn hàng thành công",
      data: {
        transactionId: transaction[0]._id,
        newBalance: wallet.balance + returnRequest.refundAmount,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Process Refund For Return Request Error:", error);
    return res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
