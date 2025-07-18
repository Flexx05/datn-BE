import cron from "node-cron";
import Conversation from "../models/conversation.model";

export const startConversationStatusCheckJob = () => {
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    try {
      const conversationActive = await Conversation.find({
        status: "active",
        lastUpdated: { $lte: thirtyMinutesAgo },
      });

      const conversationWaiting = await Conversation.find({
        status: "waiting",
        lastUpdated: { $lte: thirtyMinutesAgo },
      });

      // Cập nhật active => waiting
      for (const conv of conversationActive) {
        const lastMessage = conv.messages?.[conv.messages.length - 1];
        const lastSender = lastMessage?.senderId || null;

        await Conversation.findByIdAndUpdate(conv._id, {
          status: "waiting",
          updatedBy: lastSender,
          lastUpdated: now,
        });
      }

      // Cập nhật waiting => closed
      for (const conv of conversationWaiting) {
        const lastMessage = conv.messages?.[conv.messages.length - 1];
        const lastSender = lastMessage?.senderId || null;

        await Conversation.findByIdAndUpdate(conv._id, {
          status: "closed",
          updatedBy: lastSender,
          lastUpdated: now,
        });
      }

      if (conversationActive.length > 0 || conversationWaiting.length > 0) {
        console.log(
          `[${now.toLocaleString()}] Cron cập nhật trạng thái cuộc trò chuyện:
          ${conversationActive.length} active => waiting
          ${conversationWaiting.length} waiting => closed`
        );
      }
    } catch (error) {
      console.error(
        "[CRON] Lỗi khi cập nhật trạng thái cuộc trò chuyện:",
        error.message
      );
    }
  });
};
