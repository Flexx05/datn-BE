import { model, Schema } from "mongoose";

const attributeSChema = new Schema(
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

export default model("Attribute", attributeSChema);
