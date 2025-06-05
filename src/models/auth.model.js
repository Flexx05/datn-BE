import { model, Schema } from "mongoose";

const authSchema = new Schema(
  {
    fullName: {
      type: String
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: [true, "Email must be unique"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["staff", "admin", "user"],
      default: "user",
    },
    activeStatus: {
      type: Boolean,
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


export default model("Auth", authSchema);
