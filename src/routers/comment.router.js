import {Router} from "express";
import { addComment, getAllComment, updateCommentStatus, replyToComment, getCommentsForClient } from "../controllers/comment.controller";
import { verifyToken } from "../middlewares/checkComment";

const router = Router();

router.get("/comments", getAllComment);
router.post("/comments", verifyToken ,addComment);
// Admin duyệt bình luận(truyền id của bình luận)
router.put('/comments/status/:id', updateCommentStatus);
// Admin trả lời lại bình luận(truyền id của bình luận)
router.put('/comments/reply/:id', replyToComment);
// Lấy danh sách bình luận cho người dùng(truyền id của sản phẩm)
router.get("/comments/:id", getCommentsForClient);

export default router;