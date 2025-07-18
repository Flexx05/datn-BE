import dayjs from "dayjs";
import mongoose from "mongoose";
import Conversation from "../models/conversation.model";
import { getSocketInstance } from "../socket";
import { nontifyAdmin } from "./nontification.controller";

export const getAllConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find().sort({ lastUpdated: -1 });
    return res.status(200).json(conversations);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    return res.status(200).json(conversation);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { content, conversationId } = req.body;
    const user = req.user;
    const senderId = user._id;
    if (!content) return res.status(400).json({ error: "Content is required" });

    let conversation;

    // ? Nếu có truyền conversationId thì tìm kiếm theo ID
    if (conversationId) {
      if (!mongoose.Types.ObjectId.isValid(conversationId))
        return res.status(400).json({ error: "ConversationId không hợp lệ" });

      conversation = await Conversation.findById(conversationId);
      if (!conversation)
        return res.status(404).json({ error: "Conversation not found" });
    }

    // ? Nếu không có thì tìm kiếm theo người dùng và trạng thái khác "closed"
    if (!conversation && user.role !== "staff" && user.role !== "admin") {
      conversation = await Conversation.findOne({
        "participants.userId": senderId,
      }).sort({ lastUpdated: -1 });
      //? Nếu không tìm thấy cuộc trò chuyện thì tạo mới
      if (!conversation) {
        conversation = await Conversation.create({
          participants: [
            {
              userId: senderId,
              fullName: user.fullName,
              role: user.role,
              joinedAt: new Date(),
            },
          ],
          messages: [],
          // status mặc định là active
          statusLogs: [
            {
              status: "active",
              updateBy: senderId,
              updatedAt: new Date(),
            },
          ],
          // chatType mặc định là 1
          createdBy: senderId,
          lastUpdated: new Date(),
        });
      }
    }
    if (!conversation)
      return res
        .status(400)
        .json({ error: "Id đoạn chat là bắt buộc đối với staff/admin" });

    // ? Tạo tin nhắn mới
    const newMessage = {
      senderId,
      senderRole: user.role,
      content,
      readBy: [senderId],
    };

    // ? Thêm tin nhắn vào cuộc trò chuyện
    conversation.messages.push(newMessage);
    conversation.lastUpdated = new Date();

    // ? Kiểm tra admin/staff nếu chưa tham gia cuộc trò chuyện thì thêm người dùng với quyền admin/staff
    if (user.role === "staff" || user.role === "admin") {
      const participantExists = conversation.participants.some(
        (participant) => participant.userId.toString() === senderId.toString()
      );
      if (!participantExists) {
        conversation.participants.push({
          userId: senderId,
          fullName: user.fullName,
          role: user.role,
          joinedAt: new Date(),
        });
      }
    }

    // ? Cập nhật trạng thái và lưu log nếu cần
    if (conversation.status !== "active") {
      conversation.status = "active";
      conversation.updatedBy = senderId;
    }

    await conversation.save();

    const savedMessage =
      conversation.messages[conversation.messages.length - 1];

    const io = getSocketInstance();
    io.to(conversation?._id.toString()).emit("new-message", {
      conversation: conversation._id,
      message: newMessage,
    });
    io.to(conversation._id.toString()).emit("receive-message", {
      senderId,
      content: savedMessage.content,
      createdAt: savedMessage.createdAt,
    });
    const customer = conversation.participants.find(
      (participant) => participant.role === "user"
    );
    if (user.role === "user") {
      await nontifyAdmin(
        3,
        "Có tin nhắn mới",
        `Khách hàng ${customer.fullName} đã gửi tin nhắn mới`,
        conversation._id
      );
    }

    return res.status(200).json({
      message: "Gửi tin nhắn thành công",
      conversation: conversation._id,
      data: {
        ...savedMessage.toObject(),
        senderRole: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// TODO: Viết API cập nhật trạng thái đã đọc
export const readMessage = async (req, res) => {
  try {
    const user = req.user;
    const { conversationId } = req.body;
    const conversation = await Conversation.findById(conversationId);
    const participantExists = conversation.participants.some(
      (participant) => participant.userId.toString() === user._id
    );
    if (!participantExists) {
      conversation.participants.push({
        userId: user._id,
        fullName: user.fullName,
        role: user.role,
        joinedAt: new Date(),
      });
    }
    if (!conversation)
      return res.status(404).json({ error: "Conversation not found" });
    // ? Tìm ra các tin nhắn đã đọc
    const readedMessage = conversation.messages.find((message) => {
      return message.readBy.includes(user._id);
    });
    if (!readedMessage) {
      conversation.messages.forEach((message) => {
        message.readBy.push(user._id);
      });
      await conversation.save();
      return res.status(200).json({
        message: "Đọc tin nhắn thành công",
        conversation: conversation._id,
      });
    }
    return res.status(200).json({ message: "Tin nhắn đã đọc" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// TODO: Viết API xóa tin nhắn
export const deleteMessage = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const conversation = await Conversation.findOne({
      messages: {
        $elemMatch: {
          _id: id,
          senderId: user._id,
        },
      },
    });
    if (!conversation)
      return res.status(404).json({ error: "Conversation not found" });
    const message = conversation.messages.find(
      (message) => message._id.toString() == id
    );
    if (!message) return res.status(404).json({ error: "Message not found" });
    const messageId = message._id;
    const isWithin5Minutes = dayjs().diff(message.createdAt, "minute") <= 5;
    if (!isWithin5Minutes)
      return res
        .status(400)
        .json({ error: "Tin nhắn đã quá 5 phút, không thể xóa" });
    await Conversation.findOneAndUpdate(
      { "messages._id": messageId, "messages.senderId": user._id },
      { $pull: { messages: { _id: messageId } } }
    );
    return res.status(200).json({
      message: "Xóa tin nhắn thành công",
      conversation: conversation._id,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// TODO: Viết API hiển thị tin nhắn phía người dùng
export const getMessagesFromClient = async (req, res) => {
  try {
    const user = req.user;
    let conversation = await Conversation.findOne({
      participants: { $elemMatch: { userId: user._id } },
    }).sort({ lastUpdated: -1 });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [
          {
            userId: user._id,
            role: user.role,
            joinedAt: new Date(),
            fullName: user.fullName,
          },
        ],
        statusLogs: [
          {
            status: "active",
            updateBy: user._id,
            updatedAt: new Date(),
          },
        ],
      });
    }
    return res.status(200).json(conversation);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const closedConversation = async (req, res) => {};

// TODO: Tích hợp realtime cho chức năng thay đổi trạng thái cuộc trò chuyện
// TODO: Thêm chức năng tin nhắn tự động
// TODO: Thêm chức năng chat nhanh cho admin/staff
