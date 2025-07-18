import mongoose from "mongoose";
import { Wallet } from "../models/wallet.model.js";
import { Order } from "../models/order.model.js";
import { paymentModel as Payment } from "../models/payment.model.js";


export const createWallet = async (req, res) => {
  const { userId } = req.body;

  // Validate userId
  if (!userId) {
    return res.status(400).json("userId không được để trống");
  }

  // Check if wallet already exists for the user
  const existingWallet = await Wallet.findOne({ userId });
  if (existingWallet) {
    return res.status(400).json("Ví đã tồn tại cho người dùng này");
  }

  // Create new wallet
  const wallet = await Wallet.create({
    userId,
    balance: 0,
    status: 0,
    transactions: [],
  });

  // Check if wallet was created successfully
  if (!wallet) {
    return res.status(500).json("Tạo ví không thành công");
  }

  // Return success response
  return res
    .status(201)
    .json({
      message: "Tạo ví thành công",
      wallet
    });
};

// Lấy thông tin ví của người dùng
export const getWalletInfo = async (req, res) => {
  try {
    const userId = req.user._id.toString(); // Lấy userId từ JWT token

    const wallet = await Wallet.findOne({ userId })
      .populate("userId", "email fullName") // Lấy email và fullName từ Auth

    if (!wallet) {
      return res.status(404).json({
        message: "Ví không tồn tại",
      });
    }

    return res.status(200).json({
      message: "Lấy thông tin ví thành công",
      data: {
        wallet,
      },
    });
  } catch (error) {
    console.error("Get Wallet Info Error:", error);
    return res.status(400).json({
      message: error.message,
    });
  }
};

// Lấy lịch sử giao dịch của ví
export const getWalletTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      search = "",
    } = req.query;
    const userId = req.user._id.toString(); // Lấy userId từ JWT token

    // Tìm ví của người dùng
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({
        message: "Ví không tồn tại",
      });
    }

    // Tạo query cho transactions
    const query = {
      walletId: wallet._id,
    };

    // Tìm kiếm theo description
    if (search) {
      query.description = { $regex: search, $options: "i" };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(query)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("orderId", "orderCode totalAmount"); // Lấy thông tin orderCode và totalAmount

    const total = await Transaction.countDocuments(query);

    return res.status(200).json({
      message: "Lấy danh sách giao dịch thành công",
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get Wallet Transactions Error:", error);
    return res.status(400).json({
      message: error.message,
    });
  }
};

// Hoàn tiền đơn hàng (trả hàng)
export const refundOrder = async (req, res) => {
  try {
    const { orderId, amount } = req.body; // amount: số tiền hoàn, có thể nhỏ hơn totalAmount
    const userId = req.user._id.toString(); // Lấy userId từ JWT token

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Kiểm tra đơn hàng
      const order = await Order.findOne({
        _id: orderId,
        userId,
        paymentStatus: 1, // Đã thanh toán
        returnStatus: 4, // Đã hoàn tiền
      }).session(session);

      if (!order) {
        throw new Error(
          "Đơn hàng không hợp lệ hoặc yêu cầu hoàn tiền chưa được duyệt"
        );
      }

      if (amount > order.totalAmount) {
        throw new Error("Số tiền hoàn vượt quá tổng tiền đơn hàng");
      }

      // 2. Kiểm tra ví của người dùng
      const wallet = await Wallet.findOne({ userId, status: 0 }).session(
        session
      ); // status: 0 (active)
      if (!wallet) {
        throw new Error("Ví không tồn tại hoặc bị khóa");
      }

      // 3. Kiểm tra payment
      // const payment = await Payment.findOne({
      //   orderId,
      //   userId,
      //   status: 1,
      // }).session(session);

      if (!payment) {
        throw new Error("Không tìm thấy thông tin thanh toán hợp lệ");
      }

      // 4. Tạo giao dịch hoàn tiền
      const transaction = await Transaction.create(
        [
          {
            walletId: wallet._id,
            orderId,
            type: "refund",
            amount,
            status: 1, // Thành công
            description: `Hoàn tiền đơn hàng #${order.orderCode}`,
          },
        ],
        { session }
      );

      // 5. Cập nhật ví, đơn hàng và payment
      await Wallet.updateOne(
        { _id: wallet._id },
        {
          $inc: { balance: amount }, // Cộng số tiền hoàn vào ví
          $push: { transactions: transaction[0]._id }, // Thêm giao dịch vào danh sách
        },
        { session }
      );

      await Order.updateOne(
        { _id: orderId },
        {
          paymentStatus: 2, // Hoàn tiền
          transactionId: transaction[0]._id, // Liên kết với giao dịch
        },
        { session }
      );

      // await Payment.updateOne(
      //   { orderId },
      //   { status: 3 },
      //   { session }
      // );

      await session.commitTransaction();
      return res.status(200).json({
        message: "Hoàn tiền đơn hàng thành công",
        data: {
          transactionId: transaction[0]._id,
          newBalance: wallet.balance + amount,
        },
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Refund Order Error:", error);
    return res.status(400).json({
      message: error.message,
    });
  }
};

// Hoàn tiền khi hủy đơn hàng
export const cancelOrderRefund = async (req, res) => {
  const { orderId, type, amount, status, description } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const wallet = await Wallet.findOne({ userId: order.userId });
    if (!wallet || wallet.status === 1) {
      return res
        .status(400)
        .json({ success: false, message: "Wallet not found or locked" });
    }

    wallet.transactions.push({
      orderId,
      type,
      amount,
      status,
      description,
    });

    wallet.balance += amount;
    await wallet.save();

    res.json({ success: true, message: "Refund processed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

