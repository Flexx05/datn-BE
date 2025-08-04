import mongoose, { Schema, model } from "mongoose";

const transactionSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    type: {
      type: Number,
      required: true,
      default: 0,
      enum: [0, 1],
      // 0: Hoàn tiền
      // 1: Thanh toán
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: Number,
      required: true,
      default: 0,
      enum: [0, 1, 2], // 0: Chưa xử lý, 1: Thành công, 2: Thất bại
    },
    description: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const walletSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      unique: true,
    },
    // Số dư trong ví
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    status: {
      type: Number,
      enum: [0, 1], // 0: active, 1: locked
      default: 0,
    },
    // Lịch sử giao dịch liên quan đến ví (nhúng trực tiếp)
    transactions: [transactionSchema],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Wallet = mongoose.models.Wallet || model("Wallet", walletSchema);

export default Wallet;
