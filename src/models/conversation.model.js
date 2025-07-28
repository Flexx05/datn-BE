import { model, models, Schema } from "mongoose";

// * Schema cho người dùng tham gia chat
const ParticipantSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: [true, "Auth ID is required"],
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
    versionKey: false,
  }
);

// * Schema cho tin nhắn chat
const MessageSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },
    senderRole: {
      type: String,
      enum: ["admin", "staff", "user", "system"],
      required: [true, "Sender role is required"],
    },
    content: {
      type: String,
    },
    files: {
      type: [String],
      default: [],
    },
    readBy: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// *Schema log lưu lịch sử trạng thái
const StatusLogSchema = new Schema({
  status: {
    type: String,
    enum: ["active", "waiting", "closed"],
    required: [true, "Status is required"],
  },
  updateBy: {
    type: Schema.Types.ObjectId,
    ref: "Auth",
    required: [true, "Update by is required"],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// * Schema cho cuộc trò chuyện
const ConversationSchema = new Schema(
  {
    participants: {
      type: [ParticipantSchema],
      required: [true, "Participants are required"],
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
    statusLogs: {
      type: [StatusLogSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "waiting", "closed"],
      default: "active",
    },
    chatType: {
      type: Number,
      enum: [1, 2, 3, 4],
      /**
       * ? 1: Support: tin nhắn hỗ trợ
       * ? 2: Order: tin nhắn đơn hàng
       * ? 3: Feedback: phản hồi từ người dùng
       * ? 4: Other: các loại tin nhắn khác
       */
      default: 1,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

export const Conversation =
  models.Conversation || model("Conversation", ConversationSchema);

export default Conversation;

// ! Middleware để ghi log vào statusLogs

ConversationSchema.pre("save", function (next) {
  if (this.isModified("status") && this.updatedBy) {
    this.statusLogs.push({
      status: this.status,
      updateBy: this.updatedBy,
      updatedAt: new Date(),
    });
  }

  // Cập nhật thời gian chỉnh sửa
  this.lastUpdated = new Date();
  next();
});
