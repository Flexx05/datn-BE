import cron from "node-cron";
import authModel from "../models/auth.model";
export const startDeleteAccountNotVerify = () => {
  cron.schedule("0 0 * * *", async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      const accountNotVerify = await authModel.find({
        $or: [{ isVerify: false }, { isVerify: { $exists: false } }],
        createdAt: { $lte: thirtyDaysAgo },
      });

      for (const acc of accountNotVerify) {
        await authModel.findByIdAndDelete(acc._id);
      }
      if (accountNotVerify.length > 0)
        console.log(`[CRON] Xóa ${accountNotVerify.length} tài khoản`);
    } catch (error) {
      console.error("[CRON] Lỗi cron khi xóa tài khoản", error.message);
    }
  });
};
