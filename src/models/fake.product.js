import mongoose, {Schema} from "mongoose";

const productSchema = new mongoose.Schema(
    {
      name: {
        type: String,
        required: [true, "Tên sản phẩm bắt buộc nhập"],
      },
      image: {
        type: [String],
      },
      description: {
        type: String,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );
export default mongoose.model("Product", productSchema);