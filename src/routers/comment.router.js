import { Router } from "express";
import {
  addComment,
  getAllComment,
  getCommentById,
  getCommentsForClient,
  replyToComment,
  updateCommentStatus,
} from "../controllers/comment.controller";
import { isAdmin, verifyToken } from "../middlewares/checkAuth.js";

const router = Router();

// Routes cho admin/staff
router.get("/comments", verifyToken, isAdmin, getAllComment);
router.get("/comments/id/:id", verifyToken, isAdmin, getCommentById);
router.patch("/comments/edit/:id", verifyToken, isAdmin, updateCommentStatus);
router.patch("/comments/reply/:id", verifyToken, isAdmin, replyToComment);

// Routes cho client
router.post("/comments/add", verifyToken, addComment);
router.get("/comments/:id", getCommentsForClient);

export default router;
