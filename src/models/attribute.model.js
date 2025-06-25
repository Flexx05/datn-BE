import mongoose, { model, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const attributeSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Tên thuộc tính khôn được để trống"],
    },
    slug: {
      type: String,
    },
    values: [String],
    isColor: {
      type: Boolean,
      default: false,
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
attributeSchema.plugin(mongoosePaginate);

export const attributeModel =
  mongoose.models.Attribute || model("Attribute", attributeSchema);

export default attributeModel;
