import mongoose, {Schema} from "mongoose";

const productSchema = new mongoose.Schema(
    {
      name: {
        type: String,
        required: [true, "Tên sản phẩm bắt buộc nhập"],
      },
      slug: {
        type: String,
      },
      image: {
        type: [String],
      },
      brandId: {
        type: Schema.Types.ObjectId,
        ref: "Brand",
        // required: [true, "Thương hiệu bắt buộc nhập"],
      },
      brandName: {
        type: String,
      },
      categoryId: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        // required: [true, "Danh mục bắt buộc nhập"],
      },
      categoryName: {
        type: String,
      },
      description: {
        type: String,
      },
      averageRating: {
        type: Number,
        default: 0,
      },
      reviewCount: {
        type: Number,
        default: 0,
      },
      ratingCount: {
        type: Map,
        of: Number,
        default: {},
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