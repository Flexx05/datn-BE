import { Router } from "express";
import {
  createQuickChat,
  deleteQuickChat,
  getAllQuickChat,
  getQuickChatById,
  updateQuickChat,
} from "../controllers/quickChat.controller";
import { verifyToken } from "../middlewares/checkAuth";

const router = Router();

router.get("/quick-chat", getAllQuickChat);
router.get("/quick-chat/id/:id", getQuickChatById);
router.post("/quick-chat/add", verifyToken, createQuickChat);
router.patch("/quick-chat/edit/:id", verifyToken, updateQuickChat);
router.delete("/quick-chat/delete/:id", verifyToken, deleteQuickChat);

export default router;
