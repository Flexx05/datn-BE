import mongoose from "mongoose";
import Conversation from "../models/conversation.model";
import { getSocketInstance } from "../socket";
import { nontifyAdmin } from "./nontification.controller";
import authModel from "../models/auth.model";

export const getAllConversations = async (req, res) => {
  try {
    const { chatType, status } = req.query;
    const query = {};

    if (chatType !== undefined) {
      const chatTypeNumber = Number(chatType);

      if (chatTypeNumber === 0) {
        // Lấy tất cả các loại chat cụ thể (nếu muốn lọc)
        query.chatType = { $in: [1, 2, 3, 4] };
      } else {
        query.chatType = chatTypeNumber;
      }
    }

    if (status !== undefined) {
      if (status === "all") {
        query.status = { $in: ["active", "waiting", "closed"] };
      } else query.status = status;
    }

    const conversations = await Conversation.find(query)
      .sort({ lastUpdated: -1 })
      .populate({
        path: "participants.userId",
        select: "fullName avatar role isActive",
      });

    return res.status(200).json(conversations);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id).populate({
      path: "participants.userId",
      select: "fullName avatar role isActive",
    });
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
    const { content = "", files = [], conversationId } = req.body;
    const user = req.user;
    const senderId = user._id;
    const io = getSocketInstance();

    let conversation;
    let isNewConversation = false;
    let isStatusChangedToActive = false;

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
        isNewConversation = true;
        conversation = await Conversation.create({
          participants: [
            {
              userId: senderId,
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

    // ? Cập nhật trạng thái và lưu log nếu cần
    if (conversation.status !== "active") {
      isStatusChangedToActive = true;
      conversation.status = "active";
      conversation.updatedBy = senderId;
      conversation.statusLogs.push({
        status: "active",
        updateBy: senderId,
        updatedAt: new Date(),
      });
    }

    // ? Tạo tin nhắn mới
    const newMessage = {
      senderId,
      senderRole: user.role,
      content,
      files,
      readBy: [senderId],
    };

    const customerInfo = await authModel.findById(
      conversation.participants[0].userId
    );

    if (newMessage.senderRole !== "user" && customerInfo.isActive === false) {
      return res
        .status(400)
        .json({ message: "Không thể gửi tin nhắn cho tài khoản bị khóa" });
    }

    // ? Thêm tin nhắn vào cuộc trò chuyện
    conversation.messages.push(newMessage);
    conversation.lastUpdated = new Date();
    conversation.updatedBy = senderId;

    // ? Kiểm tra admin/staff nếu chưa tham gia cuộc trò chuyện thì thêm người dùng với quyền admin/staff
    if (user.role === "staff" || user.role === "admin") {
      const participantExists = conversation.participants.some(
        (participant) => participant.userId.toString() === senderId.toString()
      );
      if (!participantExists) {
        conversation.participants.push({
          userId: senderId,
          joinedAt: new Date(),
        });
      }
    }
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (isStatusChangedToActive && lastMessage.senderRole === "user") {
      const systemMessage = {
        senderId: null,
        senderRole: "system",
        content:
          "Xin chào! Chúng tôi đã nhận được tin nhắn của bạn, nhưng do có quá nhiều yêu cầu nên phản hồi của chúng tôi có thể bị chậm trễ. Chúng tôi sẽ phản hồi lại bạn sớm nhất có thể. Cảm ơn sự thông cảm của bạn.",
        createdAt: new Date(),
        readBy: [],
      };
      conversation.messages.push(systemMessage);
    } else if (isNewConversation) {
      const systemMessage = {
        senderId: null,
        senderRole: "system",
        content: "Xin chào! Cảm ơn vì đã tin tưởng Binova. Bạn cần hỗ trợ gì?",
        createdAt: new Date(),
        readBy: [],
      };
      conversation.messages.push(systemMessage);
      io.to(conversation._id.toString()).emit("new-message", {
        conversation: conversation._id,
        message: systemMessage,
      });
    }

    await conversation.save();

    const savedMessage =
      conversation.messages[conversation.messages.length - 1];

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
    console.error("Send Message Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// TODO: Viết API hiển thị tin nhắn phía người dùng
export const getMessagesFromClient = async (req, res) => {
  try {
    const user = req.user;
    let conversation = await Conversation.findOne({
      participants: { $elemMatch: { userId: user._id } },
    }).sort({ lastUpdated: -1 });
    let isNewConversation = false;
    if (!conversation) {
      isNewConversation = true;
      conversation = await Conversation.create({
        participants: [
          {
            userId: user._id,
            joinedAt: new Date(),
          },
        ],
        statusLogs: [
          {
            status: "active",
            updateBy: user._id,
            updatedAt: new Date(),
          },
        ],
        status: "waiting",
        updatedBy: user._id,
      });
    }
    if (isNewConversation) {
      const systemMessage = {
        senderId: null,
        senderRole: "system",
        content: "Xin chào! Cảm ơn vì đã tin tưởng Binova. Bạn cần hỗ trợ gì?",
        createdAt: new Date(),
        readBy: [],
      };
      conversation.messages.push(systemMessage);
      await conversation.save();
      const io = getSocketInstance();
      io.to(conversation._id.toString()).emit("receive-message", {
        senderId: null,
        content: systemMessage.content,
        createdAt: systemMessage.createdAt,
      });
    }
    return res.status(200).json(conversation);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const closedConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const conversation = await Conversation.findById(id);
    if (!conversation)
      return res.status(404).json({ error: "Conversation not found" });
    conversation.status = "closed";
    conversation.updateBy = user._id;
    conversation.lastUpdated = new Date();
    conversation.statusLogs.push({
      status: "closed",
      updateBy: user._id,
      updatedAt: new Date(),
    });
    await conversation.save();
    return res.status(200).json(conversation);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const changeChatType = async (req, res) => {
  try {
    const { id } = req.params;
    const { chatType } = req.body;
    const conversation = await Conversation.findByIdAndUpdate(id, {
      chatType,
    });
    if (!conversation)
      return res.status(404).json({ error: "Conversation not found" });
    return res.status(200).json(conversation);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
