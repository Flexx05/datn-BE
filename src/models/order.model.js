import mongoose, {Schema, model } from "mongoose";

const orderItemSchema = new Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    variationId: {
      type: Schema.Types.ObjectId,
      ref: "Variation",
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
    priceAtOrder: {
        type: Number,
        required: true,
        min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
},{_id: true}
)

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },
    recipientInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    orderCode: {
      type: String,
      required: true,
      unique: true,
    },
    voucherId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Voucher",
      },
    ],
    shippingAddress: {
      type: String,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5],
      // 0: Cho xac nhan
      // 1: Da xac nhan
      // 2: Dang giao hang
      // 3: Da giao hang
      // 4: Hoan thanh
      // 5: Da huy
      // 6: Hoan hang
      default: 0,
    },
    paymentStatus: {
      type: Number,
      enum: [0, 1, 2, 3],
      // 0: Chua thanh toan
      // 1: Da thanh toan
      // 2: Hoan tien
      // 3: Da huy
      default: 0,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    expectedDeliveryDate: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    deliveryDate: {
      type: Date,
      default: null,
    },
    returnRequest: {
      returnStatus: {
        type: String,
        enum: ["Khong yeu cau", "Yeu cau hoan hang", "Da duyet", "Tu choi"],
        default: "Khong yeu cau",
      },
      clientReason: {
        type: String,
        default: null, // lý do của khách hàng khi yêu cầu hoàn hàng
      },
      adminNote: {
        type: String,
        default: null, // ghi chú của admin về yêu cầu hoàn hàng
      },
      refundMethod: {
        type: String,
        enum: ["COD", "Vi"],
        default: null,
      },
    },
    completedBy: {
      type: String,
      enum: ["user", "system", null],
      default: null,
    },
    note: {
      type: String,
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default model("Order", orderSchema);
