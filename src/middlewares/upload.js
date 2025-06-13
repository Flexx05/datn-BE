import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Cấu hình storage cho Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "comments", // Thư mục lưu trong Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "gif"], // Định dạng file cho phép
    transformation: [{ width: 1000, height: 1000, crop: "limit" }] // Giới hạn kích thước ảnh
  }
});

// Cấu hình upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
  }
});

export default upload; 