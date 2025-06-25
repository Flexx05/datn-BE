import mongoose, { model, Schema } from "mongoose";

const paymentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["VNPAY", "COD", "MOMO"],
    },
    status: {
      type: Number,
      default: 0, // 0: Chưa thanh toán, 1: Đã thanh toán, 2: Thanh toán thất bại, 3: Đã hoàn tiền
    },
    transactionId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    responseData: {
      type: Object,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const paymentModel =
  mongoose.models.Payment || model("Payment", paymentSchema);

export default paymentModel;
