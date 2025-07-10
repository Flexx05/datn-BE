import cron from "node-cron";
import Voucher from "../models/voucher.model.js";
import { getSocketInstance } from "../socket.js";

export const startVoucherStatusJob = () => {
  cron.schedule("* * * * *", async () => {
    const now = new Date();

    try {
      // 1. inactive → active nếu đã đến startDate
      const updatedActive = await Voucher.updateMany(
        {
          voucherStatus: "inactive",
          startDate: { $lte: now },
          endDate: { $gt: now },
        },
        { $set: { voucherStatus: "active" } }
      );

      // 2. active/inactive → expired nếu đã quá endDate
      const updatedExpiredByDate = await Voucher.updateMany(
        {
          voucherStatus: { $in: ["active", "inactive"] },
          endDate: { $lt: now },
        },
        { $set: { voucherStatus: "expired" } }
      );

      // 3. active → expired nếu dùng hết số lượng
      const updatedExpiredByQuantity = await Voucher.updateMany(
        {
          voucherStatus: "active",
          $expr: { $gte: ["$used", "$quantity"] },
        },
        { $set: { voucherStatus: "expired" } }
      );
      
      const io = getSocketInstance();
      if (io) {
        io.emit("voucherStatusUpdated", { time: now }); // Có thể gửi thêm dữ liệu chi tiết nếu muốn
      }
      console.log(`[${now.toLocaleString()}] ✅ Cron cập nhật trạng thái: 
        ${updatedActive.modifiedCount} active, 
        ${updatedExpiredByDate.modifiedCount} expired (hết hạn), 
        ${updatedExpiredByQuantity.modifiedCount} expired (hết lượt)`);
    } catch (error) {
      console.error("❌ Cron lỗi:", error.message);
    }
  });
};
