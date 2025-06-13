import {Router} from "express";
import { addComment, getAllComment, updateCommentStatus, replyToComment, getCommentsForClient, getCommentById } from "../controllers/comment.controller";
import { verifyToken, checkAdminAndStaff } from "../middlewares/checkComment";
import upload from "../middlewares/upload";

const router = Router();

// Routes cho admin/staff
router.get("/comments", verifyToken, checkAdminAndStaff, getAllComment);
router.get("/comments/id/:id", verifyToken, checkAdminAndStaff, getCommentById);
router.patch("/comments/edit/:id", verifyToken, checkAdminAndStaff, updateCommentStatus);
router.patch("/comments/reply/:id", verifyToken, checkAdminAndStaff, replyToComment);

// Routes cho client
router.post("/comments/add", verifyToken, (req, res, next) => {
  console.log("Request body:", req.body);
  console.log("Request files:", req.files);
  upload.array("images", 5)(req, res, next);
}, addComment);
router.get("/comments/:id", getCommentsForClient);

export default router;