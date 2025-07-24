import mongoose, { model, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const authSchema = new Schema(
  {
    fullName: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: [true, "Email must be unique"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["staff", "admin", "user"],
      default: "user",
    },
    activeStatus: {
      type: Boolean,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordVerified: {
      type: Boolean,
      default: false,
    },
    isVerify: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      default: null,
    },
    rank: {
      type: Number,
      default: null, // 0: Đồng, 1: Bạc, 2: Vàng, 3: Kim cương
    },
    rankUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

authSchema.plugin(mongoosePaginate);

export const authModel = mongoose.models.Auth || model("Auth", authSchema);

export default authModel;
