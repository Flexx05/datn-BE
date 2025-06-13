import jwt from "jsonwebtoken";
import Auth from "../models/auth.model.js";

export const verifyToken = async (req, res, next) => {
    const token = req.header('Authorization')?.replace("Bearer ", "");
    if(!token) {
        return res.status(401).json({
            message: "Bạn không có quyền truy cập"
        })
    }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || "secret"); // Giải mã token
    if (!decoded) {
      return res.status(401).json({ message: "Token không hợp lệ." });
    }

    const user = await Auth.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Người dùng không tồn tại." });
    }

    req.user = user; // Gắn thông tin user vào req để dùng sau
    next(); // Cho phép đi tiếp đến controller
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: "Token không hợp lệ. Vui lòng đăng nhập lại." 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: "Token đã hết hạn. Vui lòng đăng nhập lại." 
      });
    }
    return res.status(401).json({ 
      message: "Lỗi xác thực. Vui lòng đăng nhập lại." 
    });
  }
};

export const checkAdminAndStaff = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    if (user.role !== "admin" && user.role !== "staff") {
      return res.status(403).json({ 
        message: "Bạn không có quyền thực hiện chức năng này" 
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};