import mongoose, { model, Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    type: {
      type: Number,
      required: [true, "Type is required"],
      enum: [0, 1, 2, 3, 4],
      /**
       * 0: order
       * 1: order-status
       * 2: comment
       * 3: chat
       * 4: system
       */
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // recipientId: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Auth",
    //   required: [true, "Recipient ID is required"],
    // },
    link: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
    versionKey: false,
  }
);

export const notificationModel =
  mongoose.models.Notification || model("Notification", notificationSchema);

export default notificationModel;
