import cron from "node-cron";
import authModel from "../models/auth.model.js";
import dayjs from "dayjs";
import { sendMail } from "../utils/sendMail.js";
import orderModel from "../models/order.model.js";
import Voucher from "../models/voucher.model.js";
import { createVoucherMonthly } from "../utils/createVoucherRank.js";

function getRankName(rank) {
  switch (rank) {
    case 3:
      return "Kim cương";
    case 2:
      return "Vàng";
    case 1:
      return "Bạc";
    case 0:
      return "Đồng";
    default:
      return "Thành viên";
  }
}

// Hàm cảnh báo tụt hạng
const sendRankWarning = async (user) => {
  if (user?.isActive === false || user.rank == null || user.rank === 0) return;

  const userId = user._id;
  const date90DaysAgo = dayjs().subtract(90, "day").toDate();
  const orders = await orderModel.find({
    userId,
    status: 4,
    paymentStatus: 1,
    createdAt: { $gte: date90DaysAgo },
  });

  const totalSpending = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const spendingScore = Math.floor(totalSpending / 1000);

  // Kiểm tra điều kiện giữ hạng
  const rankTarget = [3000, 7000, 15000, 30000];
  const currentNeed = rankTarget[user.rank] ?? 0;
  const enough = spendingScore >= currentNeed;

  const cycleStart = orders[0]?.createdAt || date90DaysAgo;
  const daysPassed = dayjs().diff(dayjs(cycleStart), "day");
  const daysLeft = 90 - daysPassed;

  if (daysLeft === 7 && !enough && user.email) {
    const nextRank = Math.max(0, user.rank - 1);
    const subject = "⚠️ Thông báo: Bạn sắp bị tụt hạng!";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #fa8c16;">${subject}</h2>
        <p>Xin chào <strong>${user.fullName || user.email}</strong>,</p>
        <p>Bạn còn <strong>7 ngày</strong> nữa là kết thúc chu kỳ xét hạng.</p>
        <p>Hiện tại bạn chưa đủ điều kiện để giữ hạng <strong>${getRankName(
          user.rank
        )}</strong>. Nếu không chi tiêu thêm, bạn sẽ bị tụt xuống hạng <strong>${getRankName(
      nextRank
    )}</strong>.</p>
        <p>Hãy mua sắm ngay hôm nay để giữ vững hạng và tiếp tục nhận nhiều ưu đãi hấp dẫn!</p>

        <p style="margin-top: 24px;">Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.</p>

        <p style="margin-top: 32px;">
          Trân trọng,<br/>
          <strong>Binova Shop</strong><br/>
          <i>Chăm sóc khách hàng</i>
        </p>

        <hr style="margin: 24px 0;" />
        <p style="font-size: 12px; color: #999;">Đây là email tự động, vui lòng không trả lời lại.</p>
      </div>
    `;
    try {
      await sendMail({ to: user.email, subject, html });
      console.log("Gửi cảnh báo tụt hạng:", user.email);
    } catch (err) {
      console.error("Lỗi gửi mail cảnh báo:", err.message);
    }
  }
};

// Hàm phát voucher định kỳ (mỗi đầu tháng)
const sendMonthlyVouchers = async () => {
  try {
    const monthKey = dayjs().format("YYYY-MM");

    // Chỉ tạo 1 voucher cho mỗi rank (0 = Bronze, 1 = Silver, 2 = Gold, 3 = Diamond)
    for (const rank of [0, 1, 2, 3]) {
      try {
        await createVoucherMonthly(rank, monthKey);
      } catch (err) {
        console.error(`Lỗi tạo voucher cho rank ${rank}:`, err);
      }
    }

    console.log(`🎁 Đã phát voucher theo hạng cho tháng ${monthKey}`);
  } catch (error) {
    console.error("Lỗi trong sendMonthlyVouchers:", error);
  }
};


export const startRankJob = () => {
  cron.schedule(
    "0 0 * * *", // chạy 0h mỗi ngày
    async () => {
      const users = await authModel.find({});
      for (const user of users) {
        if (user?.isActive === false) continue;
        await sendRankWarning(user);
      }
      console.log(`[${new Date().toLocaleString()}] Đã gửi cảnh báo tụt hạng`);
    },
    { timezone: "Asia/Ho_Chi_Minh" }
  );

  // Job phát voucher đầu tháng
  cron.schedule(
    "0 0 1 * *", // chạy 0h ngày 1 hàng tháng
    async () => {
      await sendMonthlyVouchers();
    },
    { timezone: "Asia/Ho_Chi_Minh" }
  );
};
