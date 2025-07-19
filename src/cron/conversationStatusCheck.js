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
        conv.status = "waiting";
        conv.updatedBy;
        conv.statusLogs.push({
          status: "waiting",
          updateBy: conv.updatedBy,
          updatedAt: now,
        });
        conv.lastUpdated = now;
        await conv.save();
      }

      // Cập nhật waiting => closed
      for (const conv of conversationWaiting) {
        conv.status = "closed";
        conv.updatedBy;
        conv.statusLogs.push({
          status: "closed",
          updateBy: conv.updatedBy,
          updatedAt: now,
        });
        conv.lastUpdated = now;
        await conv.save();
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
