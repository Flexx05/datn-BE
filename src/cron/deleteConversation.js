import cron from "node-cron";
import Conversation from "../models/conversation.model";

export const startDeleteConversationJob = () => {
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      const closedConversation = await Conversation.find({
        status: "closed",
        lastUpdated: { $lte: thirtyDaysAgo },
      });

      for (const conv of closedConversation) {
        await Conversation.findByIdAndDelete(conv._id);
      }
      if (closedConversation.length > 0)
        console.log(`[CRON] Xóa ${closedConversation.length} đoạn chat`);
    } catch (error) {
      console.error("[CRON] Lỗi cron khi xóa đoạn chat", error.message);
    }
  });
};
