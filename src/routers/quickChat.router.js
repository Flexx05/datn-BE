import { Router } from "express";
import {
  createQuickChat,
  deleteQuickChat,
  getAllQuickChat,
  getQuickChatById,
  updateQuickChat,
} from "../controllers/quickChat.controller";
import { isAdminOrStaff, verifyToken } from "../middlewares/checkAuth";

const router = Router();

router.get("/quick-chat", verifyToken, isAdminOrStaff, getAllQuickChat);
router.get("/quick-chat/id/:id", verifyToken, isAdminOrStaff, getQuickChatById);
router.post("/quick-chat/add", verifyToken, isAdminOrStaff, createQuickChat);
router.patch(
  "/quick-chat/edit/:id",
  verifyToken,
  isAdminOrStaff,
  updateQuickChat
);
router.delete(
  "/quick-chat/delete/:id",
  verifyToken,
  isAdminOrStaff,
  deleteQuickChat
);

export default router;
