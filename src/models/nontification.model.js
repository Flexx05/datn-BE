import mongoose, { model, Schema } from "mongoose";

const nontificationSchema = new Schema(
  {
    type: {
      type: String,
      required: [true, "Type is required"],
      enum: ["order", "status"],
    },
    content: {
      type: String,
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order is required"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    receiver: {
      type: String,
      default: "admin",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const nontificationModel =
  mongoose.models.Nontification || model("Nontification", nontificationSchema);

export default nontificationModel;
