import mongoose, { Schema, model } from "mongoose";

const returnRequestSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order", // Tham chiếu đến collection Order
      required: true,
    },
    // Lý do yêu cầu hoàn hàng
    reason: {
      type: String,
      required: true,
    },
    // Trạng thái yêu cầu hoàn hàng
    status: {
      type: Number,
      enum: [0, 1, 2, 3, 4],
      // 0: "ĐANG CHỜ", 1: "ĐÃ DUYỆT", 2: "Đã nhận hàng", 3: "ĐÃ HOÀN TIỀN", 4: "ĐÃ TỪ CHỐI"
      default: 0,
    },
    // Danh sách sản phẩm trong yêu cầu hoàn hàng
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    // Số tiền hoàn lại
    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Ghi chú bổ sung
    notes: {
      type: String,
    },
    // Nhân viên xử lý yêu cầu
    // processedBy: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Auth",
    // },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ReturnRequest =
  mongoose.models.ReturnRequest || model("ReturnRequest", returnRequestSchema);

export default ReturnRequest;
