import mongoose, { Schema, model } from "mongoose";

const orderItemSchema = new Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variationId: {
      type: Schema.Types.ObjectId,
      ref: "Variation",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    slug: {
      type: String,
    },
    size: {
      type: String,
    },
    color: {
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    priceAtOrder: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const orderStatusHistorySchema = new Schema(
  {
    status: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6],
      // 0: Cho xac nhan
      // 1: Da xac nhan
      // 2: Dang giao hang
      // 3: Da giao hang
      // 4: Hoan thanh
      // 5: Da huy
      // 6: Hoan hang
      required: true,
    },
    updatedByUser: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      default: null
    },
    updatedByType: {
      type: String,
      enum: ["user", "guest"],
      required: true
    },
    note: {
      type: String,
      required: function() {
        return [5, 6].includes(this.status);
      },
      default: null,
    }
  }, { 
    timestamps: { createdAt: 'changedAt', updatedAt: false }
  }
);

const paymentStatusHistorySchema = new Schema(
  {
    paymentStatus: {
      type: Number,
      enum: [0, 1, 2, 3],
      // 0: Chua thanh toan
      // 1: Da thanh toan
      // 2: Hoan tien
      // 3: Da huy
      required: true,
    },
    updatedByUser: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      default: null
    },
    updatedByType: {
      type: String,
      enum: ["user", "guest"],
      required: true
    },
    note: {
      type: String,
      default: null,
    },
  }, { 
    timestamps: { createdAt: 'changedAt', updatedAt: false }
  }
);

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
    voucherCode: {
      type: [String],
      default: [],
    },

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
    review:{
      type: Number,
      enum: [0, 1],
      default: 0,
    },
    status: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6],
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

    statusHistory: {
      type: [orderStatusHistorySchema],
      default: [],
    },

    paymentStatusHistory: {
      type: [paymentStatusHistorySchema],
      default: [],
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
    returnStatus: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5],
      // 0: Chua yeu cau
      // 1: Da yeu cau
      // 2: Da duyet
      // 3: Da tu choi
      // 4: Da hoan tien
      // 5: Da huy
      default: 0,
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
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null, // Liên kết với giao dịch hoàn tiền
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
export const Order = mongoose.models.Order || model("Order", orderSchema);

export default Order;
