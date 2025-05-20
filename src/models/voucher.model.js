import {model,mongoose, Schema} from "mongoose";

const voucherSchema = new Schema(
  {
    //Kiểu voucher
    voucherType:{
      type: String,
      enum:['product','shipping'],
      required: [true, "Loại voucher là bắt buộc"]
    },
    //Mã voucher
    code:{
      type: String,
      required: [true, "Mã giảm giá là bắt buộc"],
      unique: true,
    },
    link: {
      type: String,
      required:[true, "Link giảm giá là bắt buộc"]
    },

    // Mô tả voucher
    description: {
      type: String,
      required: [true, "Mô tả giảm giá là bắt buộc"]
    },

    // Kiểu giảm giá (cố định hoặc phần trăm)
    discountType: {
      type: String,
      enum: ["fixed", "percent"],
      required: [true, "Kiểu giảm giá là bắt buộc"],
    },

    // Giá trị giảm giá (ví dụ: 10000 hoặc 10%)
    discountValue: {
      type: Number,
      required: [true, "Giá trị giảm giá là bắt buộc"],
    },

    // Giá trị đơn hàng tối thiểu để áp dụng voucher
    minOrderValues: {
      type: Number,
      default: 0,
      required: true
    },

    // Số tiền giảm tối đa (dùng khi kiểu giảm là phần trăm)
    maxDiscount: {
      type: Number,
      required : true
    },

    // Số lượng voucher phát hành
    quantity: {
      type: Number,
      required: [true, "Số lượng voucher là bắt buộc"],
    },

    // Số lượng voucher đã sử dụng
    used: {
      type: Number,
      default: 0,
    },

    // Ngày bắt đầu hiệu lực
    startDate: {
      type: Date,
      required: [true, "Ngày bắt đầu là bắt buộc"],
    },

    // Ngày kết thúc hiệu lực
    endDate: {
      type: Date,
      required: [true, "Ngày kết thúc là bắt buộc"],
    },

    // Trạng thái của voucher: còn hiệu lực, không hiệu lực, đã hết hạn
    voucherStatus: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "inactive",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export default model('Voucher',voucherSchema)