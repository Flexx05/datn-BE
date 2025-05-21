import jwt from "jsonwebtoken";
import authModel from "../models/auth.model";

const checkAuth = async (req, res, next) => {
    const token = req.header("authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "Bạn chưa đăng nhập!" });
    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if (!decode) {
            return res.status(401).json({ message: "Token không hợp lệ!" });
        }

        const user = await authModel.findById(decode.id);

        if (user.role === "user")
            return res.status(401).json({ message: "Bạn không có quyền truy cập chức năng này!" });

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: error.message });
    }
};

export default checkAuth;
