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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auth',
      required: false
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
      enum: ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng', 'Đã hủy'],
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