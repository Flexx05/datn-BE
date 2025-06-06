import {model,mongoose, Schema} from "mongoose";

const voucherSchema = new Schema(
  {
    voucherType:{
      type: String,
      enum:['product','shipping'],
      required: [true, "Loại voucher là bắt buộc"]
    },
    code:{
      type: String,
      required: [true, "Mã giảm giá là bắt buộc"],
      unique: true,
    },
    link: {
      type: String,
      required:[true, "Link giảm giá là bắt buộc"]
    },
    description: {
      type: String,
      required: [true, "Mô tả giảm giá là bắt buộc"]
    },
    discountType: {
      type: String,
      enum: ["fixed", "percent"],
      required: [true, "Kiểu giảm giá là bắt buộc"],
    },
    discountValue: {
      type: Number,
      required: [true, "Giá trị giảm giá là bắt buộc"],
    },
    minOrderValues: {
      type: Number,
      default: 0,
      required: true
    },
    maxDiscount: {
      type: Number,
      required : true
    },
    quantity: {
      type: Number,
      required: [true, "Số lượng voucher là bắt buộc"],
    },
    used: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: [true, "Ngày bắt đầu là bắt buộc"],
    },
    endDate: {
      type: Date,
      required: [true, "Ngày kết thúc là bắt buộc"],
    },
    voucherStatus: {
      type: String,
      enum: ["active", "inactive", "expired"]
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export default model('Voucher',voucherSchema)