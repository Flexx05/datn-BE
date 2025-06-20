import { model, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const brandSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: [true, "Slug must be unique"],
    },
    logoUrl: {
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
brandSchema.plugin(mongoosePaginate);

export default model("Brand", brandSchema);