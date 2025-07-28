import cron from "node-cron";
import Conversation from "../models/conversation.model";

export const startDeleteConversationJob = () => {
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    try {
      const conversation = await Conversation.find({
        status: "closed",
        messages: { $size: 1 },
        "messages.senderRole": "system",
        lastUpdated: { $lte: twoDaysAgo },
      });

      for (const conv of conversation) {
        await Conversation.findByIdAndDelete(conv._id);
      }
      if (conversation.length > 0)
        console.log(`[CRON] Xóa đoạn chat ${conversation.length} rác`);
    } catch (error) {
      console.error("[CRON] Lỗi cron khi xóa đoạn chat", error.message);
    }
  });
};
