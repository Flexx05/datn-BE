import { Router } from "express";
import {
  getAllChatMessages,
  getChatMessagesByUserId,
  getUserMessages,
} from "../controllers/chatMessage.controller";
import { verifyToken } from "../middlewares/checkAuth";

const router = Router();

router.get("/chat-message", getAllChatMessages); // cho admin
router.get("/chat-message/user", verifyToken, getUserMessages); // cho user
router.get("/chat-message/:userId", getChatMessagesByUserId); // cho admin

export default router;
