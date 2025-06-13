import { model, Schema } from "mongoose";

// Schema cho OrderItem (Sản phẩm trong đơn hàng)
const orderItemSchema = new Schema(
  {
    variationId: {
      type: Schema.Types.ObjectId,
      ref: "Variation",
      required: [true, "Variation ID là bắt buộc"],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID là bắt buộc"],
    },
    productName: {
      type: String,
      required: [true, "Tên sản phẩm là bắt buộc"],
    },
    quantity: {
      type: Number,
      required: [true, "Số lượng sản phẩm là bắt buộc"],
      min: [1, "Số lượng sản phẩm phải lớn hơn 0"],
    },
    priceAtOrder: {
      type: Number,
      required: [true, "Đơn giá sản phẩm là bắt buộc"],
      min: [0, "Đơn giá không thể âm"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Thành tiền là bắt buộc"],
      min: [0, "Thành tiền không thể âm"],
    },
  },
  {
    _id: true, // Cho phép MongoDB tự động tạo _id cho mỗi OrderItem
  }
);

// Schema chính cho Order (Đơn hàng)
const orderSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: [true, "User ID là bắt buộc"],
    },
    orderCode: {
      type: String,
      required: [true, "Mã đơn hàng là bắt buộc"],
      unique: true,
    },
    voucherId: [
      {
        type: Schema.Types.ObjectId,
        ref: "Voucher",
      },
    ],
    shippingAddress: {
      country: {
        type: String,
        required: [true, "Quốc gia là bắt buộc"],
      },
      city: {
        type: String,
        required: [true, "Thành phố là bắt buộc"],
      },
      address: {
        type: String,
        required: [true, "Địa chỉ chi tiết là bắt buộc"],
      },
    },
    items: {
      type: [orderItemSchema],
      required: [true, "Đơn hàng phải có ít nhất một sản phẩm"],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "Đơn hàng phải có ít nhất một sản phẩm",
      },
    },
    subtotal: {
      type: Number,
      required: [true, "Tổng tiền sản phẩm là bắt buộc"],
      min: [0, "Tổng tiền sản phẩm không thể âm"],
    },
    shippingFee: {
      type: Number,
      required: [true, "Phí vận chuyển là bắt buộc"],
      min: [0, "Phí vận chuyển không thể âm"],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, "Số tiền giảm giá không thể âm"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Tổng tiền đơn hàng là bắt buộc"],
      min: [0, "Tổng tiền đơn hàng không thể âm"],
    },
    status: {
      type: String,
      enum: ["Chờ xử lý", "Đang giao hàng", "Thành công", "Đã hủy"],
      default: "Chờ xử lý",
    },
    paymentStatus: {
      type: String,
      enum: ["Chưa thanh toán", "Đã thanh toán", "Đã hoàn tiền"],
      default: "Chưa thanh toán",
    },
    paymentMethod: {
      type: String,
      required: [true, "Phương thức thanh toán là bắt buộc"],
      enum: {
        values: ["VNPAY", "COD", "MOMO"],
        message: "Phương thức thanh toán không hợp lệ",
      },
    },
    deliveryDate: {
      type: Date,
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
    versionKey: false,
  }
);

export default model("Order", orderSchema);