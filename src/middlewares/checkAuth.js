import jwt from "jsonwebtoken";
import authModel from "../models/auth.model";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Vui lòng đăng nhập để tiếp tục",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decoded.id) {
      return res.status(401).json({
        message: "Token không hợp lệ",
      });
    }

    const user = await authModel.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        message: "Không tìm thấy người dùng",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Error:", error);
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: "Token đã hết hạn",
      });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: "Token không hợp lệ",
      });
    }
    return res.status(500).json({
      message: "Lỗi xác thực",
      error: error.message,
    });
  }
};

export const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Vui lòng đăng nhập để tiếp tục",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Bạn không có quyền thực hiện hành động này",
      });
    }

    next();
  } catch (error) {
    console.error("Admin Check Error:", error);
    return res.status(500).json({
      message: "Lỗi kiểm tra quyền",
      error: error.message,
    });
  }
};

export const isStaff = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Vui lòng đăng nhập để tiếp tục",
      });
    }

    if (req.user.role !== "staff") {
      return res.status(403).json({
        message: "Bạn không có quyền thực hiện hành động này",
      });
    }

    next();
  } catch (error) {
    console.error("Staff Check Error:", error);
    return res.status(500).json({
      message: "Lỗi kiểm tra quyền",
      error: error.message,
    });
  }
};

export const isAdminOrStaff = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Vui lòng đăng nhập để tiếp tục",
      });
    }

    if (req.user.role !== "admin" && req.user.role !== "staff") {
      return res.status(403).json({
        message: "Bạn không có quyền thực hiện hành động này",
      });
    }

    next();
  } catch (error) {
    console.error("Permission Check Error:", error);
    return res.status(500).json({
      message: "Lỗi kiểm tra quyền",
      error: error.message,
    });
  }
};
