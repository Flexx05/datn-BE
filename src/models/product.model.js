import { model, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const productAttributeSchema = new Schema(
  {
    attributeId: {
      type: Schema.Types.ObjectId,
      ref: "Attribute",
      required: [true, "Thuộc tính bắt buộc nhập"],
    },
    attributeName: {
      type: String,
    },
    values: {
      type: [String],
      required: [true, "Giá trị thuộc tính bắt buộc nhập"],
    },
    isColor: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    _id: false,
  }
);

const variationSchema = new Schema(
  {
    attributes: [productAttributeSchema],
    regularPrice: {
      type: Number,
      required: [true, "Giá bán bắt buộc nhập"],
    },
    salePrice: {
      type: Number,
      default: 0,
    },
    saleFrom: {
      type: Date,
    },
    saleTo: {
      type: Date,
    },
    stock: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const productSchema = new Schema(
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
    variation: {
      type: [variationSchema],
    },
    attributes: {
      type: [productAttributeSchema],
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

productSchema.plugin(mongoosePaginate);

export default model("Product", productSchema);
