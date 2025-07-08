import { model, models, Schema } from "mongoose";

const chatMessageSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    reciverId: {
      type: String,
      required: true,
    },
    message: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ChatMessage =
  models.ChatMessage || model("ChatMessage", chatMessageSchema);

export default ChatMessage;
