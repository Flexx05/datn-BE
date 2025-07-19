import { Router } from "express";
import {
  changeChatType,
  closedConversation,
  deleteMessage,
  getAllConversations,
  getConversationById,
  getMessagesFromClient,
  readMessage,
  sendMessage,
} from "../controllers/conversation.controller";
import { isAdminOrStaff, verifyToken } from "../middlewares/checkAuth";

const router = Router();

router.post("/send-message", verifyToken, sendMessage);
router.get("/conversation", verifyToken, isAdminOrStaff, getAllConversations);
router.get(
  "/conversation/id/:id",
  verifyToken,
  isAdminOrStaff,
  getConversationById
);
router.post("/read-message", verifyToken, readMessage);
router.get("/conversation/user", verifyToken, getMessagesFromClient); // API Hiển thị tin nhắn phía client
router.delete("/message/delete/:id", verifyToken, deleteMessage); // API Xóa tin nhắn có hiệu lực trong 5 phút
router.patch(
  "/conversation/closed/:id",
  verifyToken,
  isAdminOrStaff,
  closedConversation
);
router.patch(
  "/conversation/chat-type/:id",
  verifyToken,
  isAdminOrStaff,
  changeChatType
);
export default router;
