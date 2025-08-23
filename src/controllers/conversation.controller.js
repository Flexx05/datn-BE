import mongoose from "mongoose";
import Conversation from "../models/conversation.model";
import { getSocketInstance } from "../socket";
import { nontifyAdmin } from "./nontification.controller";
import authModel from "../models/auth.model";
import Order from "../models/order.model";
import { sendMail } from "../utils/sendMail";

export const getAllConversations = async (req, res) => {
  try {
    const { chatType, status, assignedTo, search } = req.query;
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

    if (search) {
      query.search = {
        "participants.userId.fullName": { $regex: search, $options: "i" },
      };
    }

    if (assignedTo && assignedTo !== undefined) {
      if (assignedTo !== "all") {
        query.assignedTo = assignedTo;
      }
    }

    if (status !== undefined) {
      if (status === "all") {
        query.status = { $in: ["active", "waiting"] };
      } else query.status = status;
    }

    const conversations = await Conversation.find(query)
      .sort({ lastUpdated: -1 })
      .populate({
        path: "participants.userId",
        select: "fullName avatar role isActive",
      })
      .populate({
        path: "assignedTo",
        select: "fullName email",
      });

    return res.status(200).json(conversations);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id)
      .populate({
        path: "participants.userId",
        select: "fullName avatar role isActive",
      })
      .populate({
        path: "assignedTo",
        select: "fullName email",
      })
      .populate({
        path: "statusLogs.updateBy",
        select: "fullName email",
      });
    if (!conversation) {
      return res.status(404).json({ error: "Đoạn chat không tồn tại" });
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
        return res.status(404).json({ error: "Đoạn chat không tồn tại" });
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

    if (conversation.status === "closed")
      return res.status(400).json({ error: "Đoạn chat đã đóng" });

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
        .json({ error: "Không thể gửi tin nhắn cho tài khoản bị khóa" });
    }

    if (newMessage.senderRole === "staff") {
      if (
        conversation.assignedTo === null ||
        conversation.assignedTo.toString() !== senderId.toString()
      ) {
        return res
          .status(400)
          .json({ error: "Bạn chưa đăng ký cuộc trò chuyện này " });
      }
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
    }

    await conversation.save();

    const savedMessage =
      conversation.messages[conversation.messages.length - 1];

    if (newMessage) {
      io.to(conversation._id.toString()).emit("new-message", {
        conversation: conversation._id,
        message: newMessage,
      });
    }
    const customer = await authModel.findById(
      conversation.participants[0].userId
    );

    if (user.role === "user") {
      await nontifyAdmin(
        3,
        "Có tin nhắn mới",
        `Khách hàng ${customer.fullName} đã gửi tin nhắn mới`,
        conversation._id,
        null
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
    let isNewConversation = false;
    if (!conversation || conversation.status === "closed") {
      isNewConversation = true;
      conversation = await Conversation.create({
        participants: [
          {
            userId: user._id,
            joinedAt: new Date(),
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
      return res.status(404).json({ error: "Đoạn chat không tồn tại" });
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (
      lastMessage.senderRole === "user" ||
      lastMessage.senderRole === "system"
    ) {
      return res
        .status(400)
        .json({ error: "Không thể đóng khi chưa trả lời khách hàng" });
    }
    if (conversation.status !== "closed") {
      conversation.status = "closed";
      conversation.updateBy = user._id;
      conversation.lastUpdated = new Date();
      conversation.statusLogs.push({
        status: "closed",
        updateBy: user._id,
        updatedAt: new Date(),
      });
    }
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
      return res.status(404).json({ error: "Đoạn chat không tồn tại" });
    return res.status(200).json(conversation);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const assignToConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const conversation = await Conversation.findById(id);

    if (!conversation)
      return res.status(404).json({ error: "Đoạn chat không tồn tại" });
    if (conversation.assignedTo !== null) {
      return res.status(400).json({ error: "Đoạn chat này đã được đăng ký" });
    }
    if (conversation.status === "closed") {
      return res.status(400).json({ error: "Đoạn chat đã kết thúc" });
    }
    conversation.assignedTo = user._id;
    await conversation.save();
    return res.status(200).json(conversation);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const unAssignToConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const conversation = await Conversation.findById(id);
    if (!conversation)
      return res.status(404).json({ error: "Đoạn chat không tồn tại" });
    if (conversation.assignedTo === null) {
      return res.status(400).json({ error: "Đoạn chat này chưa được đăng ký" });
    }
    const isAssignedToOthers =
      conversation.assignedTo.toString() !== user._id.toString();

    // Nếu là staff và cố gắng hủy đăng ký người khác
    if (user.role !== "admin" && isAssignedToOthers) {
      return res
        .status(400)
        .json({ error: "Không thể hủy đăng ký của người khác" });
    }

    const customerInfo = await authModel.findById(
      conversation.participants[0].userId
    );

    if (user.role === "admin") {
      await nontifyAdmin(
        5,
        "Hủy đăng ký",
        `Đoạn chat với khách hàng ${
          customerInfo?.fullName || "Không xác định"
        } đã bị hủy đăng ký bởi Quản trị viên.`,
        conversation._id,
        conversation.assignedTo
      );
    }

    conversation.assignedTo = null;
    await conversation.save();
    return res.status(200).json(conversation);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const assignConversationToStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;
    const conversation = await Conversation.findById(id);
    if (!conversation)
      return res.status(404).json({ error: "Đoạn chat không tồn tại" });
    if (conversation.assignedTo !== null) {
      return res.status(400).json({ error: "Đoạn chat này đã được đăng ký" });
    }
    if (conversation.status === "closed") {
      return res.status(400).json({ error: "Đoạn chat đã kết thúc" });
    }

    const customerInfo = await authModel.findById(
      conversation.participants[0].userId
    );

    await nontifyAdmin(
      5,
      "Đăng ký",
      `Đoạn chat với khách hàng ${
        customerInfo?.fullName || "Không xác định"
      } đăng ký bởi Quản trị viên.`,
      conversation._id,
      staffId
    );
    conversation.assignedTo = staffId;
    await conversation.save();
    return res.status(200).json(conversation);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const sendMessageFromOrder = async (req, res) => {
  try {
    const { content = "", files = [] } = req.body;
    const { orderId } = req.params;
    const user = req.user;
    const io = getSocketInstance();
    if (!orderId) {
      return res.status(400).json({ error: "OrderId là bắt buộc" });
    }
    // Lấy order và kiểm tra userId
    const order = await Order.findOne({
      _id: orderId,
      status: { $in: [4, 6] },
    });
    if (!order || !order.userId) {
      return res.status(404).json({
        error: "Không tìm thấy đơn hàng hoặc userId trong đơn hàng",
      });
    }
    let conversation;

    conversation = await Conversation.findOne({
      participants: { $elemMatch: { userId: order.userId } },
      status: { $ne: "closed" },
      chatType: 2,
    });

    // Nếu chưa có thì tạo mới
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [{ userId: order.userId, joinedAt: new Date() }],
        messages: [],
        chatType: 2,
        status: "active",
        statusLogs: [
          { status: "active", updateBy: user._id, updatedAt: new Date() },
        ],
        lastUpdated: new Date(),
      });
    }
    // Nếu là staff thì tự động thêm vào assignedTo
    if (user.role === "staff") {
      conversation.assignedTo = user._id;
    }

    // Kiểm tra xem người dùng đã tham gia cuộc trò chuyện chưa
    // Nếu chưa thì thêm người dùng vào participants
    const exists = conversation.participants.some(
      (p) => p.userId.toString() === user._id.toString()
    );
    if (!exists) {
      conversation.participants.push({
        userId: user._id,
        joinedAt: new Date(),
      });
    }

    // Thêm tin nhắn
    const newMessage = {
      senderId: user._id,
      senderRole: user.role,
      content,
      files,
      readBy: [user._id],
    };
    conversation.messages.push(newMessage);
    conversation.lastUpdated = new Date();
    conversation.updatedBy = user._id;
    await conversation.save();
    // Gửi mail cho người dùng
    await sendMail({
      to: order.recipientInfo.email,
      subject: `Tin nhắn mới từ Binova về đơn hàng #${order?.orderCode}`,
      html: `<html lang="vi">
            <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:24px 12px;">
                    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-collapse:collapse;">
                      <!-- Header -->
                      <tr>
                        <td style="padding:20px 24px;background-color:#0d47a1;color:#ffffff;">
                          <h1 style="margin:0;font-size:18px;font-weight:600;color:#ffffff;">Binova</h1>
                        </td>
                      </tr>
                      <!-- Body -->
                      <tr>
                        <td style="padding:24px;">
                          <p style="margin:0 0 16px 0;color:#333333;font-size:15px;">
                            Kính gửi Quý khách <strong>${order.recipientInfo.name}</strong>,
                          </p>
                          <p style="margin:0 0 16px 0;color:#333333;font-size:15px;line-height:1.5;">
                           Chúng tôi đã gửi cho bạn tin nhắn mới liên quan đến đơn hàng <strong>#${order?.orderCode}</strong>
                            từ Binova. Dưới đây là nội dung tin nhắn: ${content}
                          </p>
                          <p style="margin:0 0 16px 0;color:#333333;font-size:15px;line-height:1.5;">
                            Chúng tôi rất mong sẽ nhận được phản hồi sớm nhất từ quý khách để chúng tôi có thể hỗ trợ tốt nhất.
                          </p>
                          <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px 0;border-collapse:collapse;">
                            <tr>
                              <td style="vertical-align:top;padding-right:12px;">
                                <strong style="display:block;color:#333333;font-size:14px;">Email:</strong>
                                <a href="mailto:binovaweb73@gmail.com" style="color:#0d47a1;text-decoration:none;font-size:14px;">binovaweb73@gmail.com</a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0 0 6px 0;color:#333333;font-size:15px;">
                            Chúng tôi chân thành cảm ơn Quý khách đã tin tưởng và lựa chọn <strong>Binova</strong>.
                          </p>
                          <p style="margin:18px 0 0 0;color:#333333;font-size:15px;">Trân trọng,</p>
                          <p style="margin:6px 0 0 0;color:#333333;font-size:14px;">
                            Bộ phận Chăm sóc Khách hàng — <span style="color:#333333;">Binova</span><br>
                          </p>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="padding:16px 24px;background-color:#fafbfd;color:#888888;font-size:12px;text-align:center;">
                          © <span>2025</span> Binova. Bảo lưu mọi quyền.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>`,
    });
    io.to(conversation._id.toString()).emit("new-message", {
      conversation: conversation._id,
      message: newMessage,
    });
    return res.status(200).json({
      message: "Gửi tin nhắn thành công",
      conversation: conversation._id,
      data: newMessage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
