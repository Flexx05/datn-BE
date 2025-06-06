import jwt from "jsonwebtoken";
import Auth from "../models/auth.model";

export const checkCartAuth = async (req, res, next) => {
  try {
    let user = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        user = await Auth.findById(decoded.id).select("-password");
      } catch (err) {
        // Token lỗi thì bỏ qua, coi như chưa đăng nhập
      }
    }
    req.user = user;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};