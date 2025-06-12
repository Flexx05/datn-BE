import { model, Schema } from "mongoose";

// Schema cho OrderItem (Sản phẩm trong đơn hàng)
const orderItemSchema = new Schema(
  {
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

// // Tạo tự động mã đơn hàng trước khi lưu
// orderSchema.pre("save", async function (next) {
//     if (!this.orderCode) {
//         const date = new Date();
//         const year = date.getFullYear().toString().slice(-2);
//         const month = (date.getMonth() + 1).toString().padStart(2, "0");
//         const day = date.getDate().toString().padStart(2, "0");
//         const random = Math.floor(Math.random() * 10000)
//             .toString()
//             .padStart(4, "0");
//         this.orderCode = `DH${year}${month}${day}-${random}`;
//     }
//     next();
// });

// // Middleware để tự động tính toán totalPrice cho mỗi OrderItem và subtotal cho Order
// orderSchema.pre("save", function (next) {
//     // Tính totalPrice cho mỗi item
//     this.items.forEach((item) => {
//         item.totalPrice = item.quantity * item.priceAtOrder;
//     });

//     // Tính subtotal
//     this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

//     // Tính totalAmount
//     this.totalAmount = this.subtotal + this.shippingFee - this.discountAmount;

//     next();
// });

// // Middleware để đảm bảo tính nhất quán của trạng thái thanh toán
// orderSchema.pre("save", function (next) {
//     if (this.paymentMethod === "COD") {
//         this.paymentStatus = "Chưa thanh toán";
//         return next();
//     }
//     // // Nếu đơn hàng là COD, mặc định là chưa thanh toán
//     // if (this.paymentMethod === "COD" && !this.isModified("paymentStatus")) {
//     //     this.paymentStatus = "Chưa thanh toán";
//     // }

//     // Kiểm tra tính hợp lệ của trạng thái thanh toán
//     const validStatusTransitions = {
//         "Chưa thanh toán": ["Đã thanh toán", "Đã hoàn tiền"],
//         "Đã thanh toán": ["Đã hoàn tiền"],
//         "Đã hoàn tiền": [],
//     };

//     if (this.isModified("paymentStatus")) {
//         const oldStatus = this._original ? this._original.paymentStatus : "Chưa thanh toán";
//         const newStatus = this.paymentStatus;

//         if (!validStatusTransitions[oldStatus].includes(newStatus)) {
//             const error = new Error(`Không thể chuyển trạng thái thanh toán từ ${oldStatus} sang ${newStatus}`);
//             return next(error);
//         }
//     }

//     next();
// });

// // Lưu trạng thái cũ trước khi cập nhật
// orderSchema.pre("save", function (next) {
//     if (this.isModified()) {
//         this._original = this.toObject();
//     }
//     next();
// });

export default model("Order", orderSchema);
