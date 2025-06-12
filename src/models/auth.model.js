import mongoose, { model, Schema } from "mongoose";

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
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // hoặc 'Admin' nếu bạn phân biệt
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default model("Auth", authSchema);
