import {Router} from "express";
import { addComment, getAllComment, updateCommentStatus, replyToComment, getCommentsForClient, getCommentById } from "../controllers/comment.controller";
import { verifyToken } from "../middlewares/checkComment";

const router = Router();

router.get("/comments", getAllComment);
// Lấy ra chi tiết bình luận theo id
router.get("/comments/id/:id", getCommentById);
// Thêm bình luận ở phía người dùng(truyền id của sản phẩm)
router.post("/comments/add", verifyToken ,addComment);
// Admin duyệt bình luận(truyền id của bình luận)
router.patch("/comments/edit/:id", updateCommentStatus);
// Admin trả lời lại bình luận(truyền id của bình luận)
router.patch("/comments/reply/:id", replyToComment);
// Lấy danh sách bình luận cho người dùng(truyền id của sản phẩm)
router.get("/comments/:id", getCommentsForClient);

export default router;