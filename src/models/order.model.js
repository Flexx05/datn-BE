import mongoose, {Schema, model } from "mongoose";

const orderItemSchema = new Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    variantAttributes: [
        {
        attributeName: { type: String, required: true },
        value: { type: String, required: true },
        },
    ],
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
    price: {
        type: Number,
        required: true,
        min: 0
    }
},{_id: false}
)

const orderSchema = new mongoose.Schema({
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },
    guestInfo: {
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
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng','Thành công', 'Đã hủy'],
      default: 'Chờ xác nhận'
    },
    paymentStatus: {
      type: String,
      enum: ['Chưa thanh toán', 'Đã thanh toán', 'Thất bại' ,'Đã hoàn tiền'],
      default: 'Chưa thanh toán'
    },
    paymentMethod: {
      type: String,
      required: true
    },
    deliveryDate: {
      type: Date
    },
  }, {
    timestamps: true,
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
});

// Thêm middleware để tự động tạo orderCode
orderSchema.pre('save', async function(next) {
    if (!this.orderCode) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
  
      const lastOrder = await this.constructor.findOne({
        orderCode: new RegExp(`DH${year}${month}${day}-\\d{3}$`)
      }).sort({ orderCode: -1 });
  
      let sequence = '001';
      if (lastOrder) {
        const lastSequence = parseInt(lastOrder.orderCode.slice(-3));
        sequence = String(lastSequence + 1).padStart(3, '0');
      }
  
      this.orderCode = `DH${year}${month}${day}-${sequence}`;
    }
  
    // Nếu không có userId thì đánh dấu là đơn hàng khách vãng lai
    if (!this.userId) {
      this.isGuestOrder = true;
    }
  
    next();
  });

export default model("Order", orderSchema);