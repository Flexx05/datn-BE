import { model, mongoose, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const voucherSchema = new Schema(
  {
    voucherType: {
      type: String,
      enum: ["product", "shipping"],
      required: [true, "Loại voucher là bắt buộc"],
    },
    code: {
      type: String,
      required: [true, "Mã giảm giá là bắt buộc"],
      unique: true,
    },
    userIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auth",
      },
    ],
    voucherScope: {
      type: String,
      enum: ["shared", "private"],
      default: "shared",
      required: true,
    },
    description: {
      type: String,
      required: [true, "Mô tả giảm giá là bắt buộc"],
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
      required: true,
    },
    maxDiscount: {
      type: Number,
      required: function () {
        return this.discountType === "percent";
      },
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
      enum: ["active", "inactive", "expired"],
      default: "inactive",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

voucherSchema.plugin(mongoosePaginate);
export const Voucher =
  mongoose.models.Voucher || model("Voucher", voucherSchema);

export default Voucher;
