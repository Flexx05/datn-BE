import { Router } from "express";
import {
  assignConversationToStaff,
  assignToConversation,
  changeChatType,
  closedConversation,
  getAllConversations,
  getConversationById,
  getMessagesFromClient,
  sendMessage,
  unAssignToConversation,
} from "../controllers/conversation.controller";
import {
  isAdmin,
  isAdminOrStaff,
  isStaff,
  verifyToken,
} from "../middlewares/checkAuth";

const router = Router();

router.post("/send-message", verifyToken, sendMessage);
router.get("/conversation", verifyToken, isAdminOrStaff, getAllConversations);
router.get(
  "/conversation/id/:id",
  verifyToken,
  isAdminOrStaff,
  getConversationById
);
router.get("/conversation/user", verifyToken, getMessagesFromClient); // API Hiển thị tin nhắn phía client
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
router.patch(
  "/conversation/assign/:id",
  verifyToken,
  isStaff,
  assignToConversation
);
router.patch(
  "/conversation/un-assign/:id",
  verifyToken,
  isAdminOrStaff,
  unAssignToConversation
);
router.patch(
  "/conversation/assign/staff/:id",
  verifyToken,
  isAdmin,
  assignConversationToStaff
);
export default router;
