import mongoose, { model, Schema } from "mongoose";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Tên danh mục không được để trống"],
    },
    slug: {
      type: String,

    },
    description: {
      type: String,
    //   required: [true, "Mô tả không được để trống"],
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    categorySort: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true }, // Chuyển đổi đối tượng thành JSON 
    toObject: { virtuals: true }, // Chuyển đổi đối tượng thành Object
  }
);

// tạo danh mục con của category
categorySchema.virtual("subCategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentId",
});

export default model("Category", categorySchema);

