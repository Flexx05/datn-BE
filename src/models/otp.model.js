import mongoose, { model, Schema } from "mongoose";

const otpSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
    },
    otp: {
      type: String,
    },
    dueDate: {
      type: Date,
      default: Date.now(),
      index: { expires: 180 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const otpModel = mongoose.models.Otp || model("Otp", otpSchema);

export default otpModel;
