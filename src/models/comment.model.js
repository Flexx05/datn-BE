import { mongoose, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const commentSchema = new Schema(
  {
    // ID sản phẩm được bình luận
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    // ID người dùng bình luận
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    // Nội dung bình luận
    content: {
      type: String,
      required: false,
      maxlength: 500,
    },

    images: {
      type: [String],
      default: [],
    },
    // Đánh giá sao
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    // Trạng thái của bình luận: Chưa duyệt và được duyệt
    status: {
      type: String,
      enum: ["hidden", "visible"],
      default: "visible",
    },
    // Nội dung trả lời bình luận của admin
    adminReply: {
      type: String,
      default: "",
    },
    // Thời gian trả lời bình luận của admin
    replyAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

commentSchema.plugin(mongoosePaginate);

export const commentModel =
  mongoose.models.Comment || mongoose.model("Comment", commentSchema);

export default commentModel;
