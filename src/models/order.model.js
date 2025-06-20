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
      required: [true, "Variation ID là bắt buộc"],
    },
    productName: {
      type: String,
      required: [true, "Tên sản phẩm là bắt buộc"],
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
      required: [true, "Thành tiền là bắt buộc"],
      min: [0, "Thành tiền không thể âm"],
    },
},{_id: true}
)

const orderSchema = new mongoose.Schema({
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
      unique: true
    },
    voucherId: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher'
    }],
    shippingAddress: {
      country: { type: String, required: true },
      city: { type: String, required: true },
      address: { type: String, required: true }
    },
    items: {
      type: [orderItemSchema],
      required: true
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    shippingFee: {
      type: Number,
      required: true,
      min: 0
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: [
              "Cho xac nhan",
              "Da xac nhan",
              "Dang giao hang",
              "Da giao hang",
              "Hoan thanh",
              "Da huy",
            ],
      default: 'Cho xac nhan'
    },
    paymentStatus: {
      type: String,
      enum: ['Chua thanh toan', 'Da thanh toan', 'Da hoan tien'],
      default: 'Chua thanh toan'
    },
    paymentMethod: {
      type: String,
      required: true
    },
    expectedDeliveryDate: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    deliveryDate: {
      type: Date,
      default: null
    },
    returnRequest: {
      returnStatus: {
        type: String,
        enum: [
          "Khong yeu cau",
          "Yeu cau hoan hang",
          "Da duyet",
          "Tu choi",
        ],
        default: "Khong yeu cau"
      },
      clientReason: {
        type: String,
        default: null          // lý do của khách hàng khi yêu cầu hoàn hàng
      },
      adminNote: {
        type: String,
        default: null          // ghi chú của admin về yêu cầu hoàn hàng
      },
      refundMethod: {
        type: String,
        enum: ["COD", "Vi"],
        default: null
      },
    },
    completedBy: {
      type: String,
      enum: ["user", "system", null],
      default: null
    },
  }, {
    timestamps: true,
    versionKey: false,
  }
);

export default model("Order", orderSchema);