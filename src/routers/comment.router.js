import {Router} from "express";
import { addComment, getAllComment, updateCommentStatus, replyToComment, getCommentsForClient, getCommentById } from "../controllers/comment.controller";
import { verifyToken, isAdminOrStaff } from "../middlewares/checkAuth.js";


const router = Router();

// Routes cho admin/staff
router.get("/comments", verifyToken, isAdminOrStaff, getAllComment);
router.get("/comments/id/:id", verifyToken, isAdminOrStaff, getCommentById);
router.patch("/comments/edit/:id", verifyToken, isAdminOrStaff, updateCommentStatus);
router.patch("/comments/reply/:id", verifyToken, isAdminOrStaff, replyToComment);

// Routes cho client
router.post("/comments/add", verifyToken, addComment);
router.get("/comments/:id", getCommentsForClient);

export default router;