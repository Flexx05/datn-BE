import { model, Schema } from "mongoose";

const attributeValueSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Tên giá trị không được để trống"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const attributeSChema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Tên thuộc tính khôn được để trống"],
    },
    slug: {
      type: String,
    },
    values: [attributeValueSchema],
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

export default model("Attribute", attributeSChema);
