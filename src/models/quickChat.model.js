import { model, models, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const quickChatSchema = new Schema(
  {
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    category: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6],
      /**
       * ? 1: Chung
       * ? 2: Đơn hàng
       * ? 3: Thanh toán
       * ? 4: Vận chuyển
       * ? 5: Hóa đơn
       * ? 6: Khác
       */
      required: [true, "Category is required"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: [true, "CreatedBy is required"],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: [true, "UpdatedBy is required"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

quickChatSchema.plugin(mongoosePaginate);

export const QuickChat =
  models.QuickChat || model("QuickChat", quickChatSchema);

export default QuickChat;
