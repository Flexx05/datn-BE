import cron from "node-cron";
import authModel from "../models/auth.model.js";
import orderModel from "../models/order.model.js";
import dayjs from "dayjs";
import { sendMail } from "../utils/sendMail.js";

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

const calculateRank = async (user) => {
  const userId = user._id;
  const date180DaysAgo = dayjs().subtract(180, "day").toDate();
  const orders = await orderModel.find({
    userId,
    status: 4,
    paymentStatus: 1,
    createdAt: { $gte: date180DaysAgo },
  });

  const totalSpending = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const spendingScore = totalSpending / 1000;
  let calculatedRank = null;

  if (spendingScore >= 60000) {
    calculatedRank = 3; // Kim cương
  } else if (spendingScore >= 30000) {
    calculatedRank = 2; // Vàng
  } else if (spendingScore >= 15000) {
    calculatedRank = 1; // Bạc
  } else if (spendingScore >= 5000) {
    calculatedRank = 0; // Đồng
  }

  // Logic tụt từng bậc: Nếu không đủ điều kiện giữ hạng hiện tại, chỉ tụt xuống 1 bậc
  let rank = user.rank;
  if (rank === null) {
    // Người mới chưa từng đạt rank
    rank = calculatedRank;
  } else {
    if (calculatedRank === null) {
      // Không đủ điều kiện cho bất kỳ hạng nào, tụt 1 bậc
      rank = Math.max(0, user.rank - 1);
    } else if (calculatedRank < user.rank) {
      // Đủ điều kiện cho hạng thấp hơn, nhưng chỉ tụt 1 bậc
      rank = user.rank - 1;
    } else {
      // Đủ điều kiện giữ hoặc lên hạng
      rank = calculatedRank;
    }
  }

  if (user.rank !== rank) {
    await authModel.findByIdAndUpdate(userId, {
      rank,
      rankUpdatedAt: new Date(),
    });
  }
};

const sendRankWarning = async (user) => {
  if (user.rank == null || user.rank === 0) return;
  const userId = user._id;
  const date173DaysAgo = dayjs().subtract(173, "day").toDate();
  const orders = await orderModel.find({
    userId,
    status: 4,
    paymentStatus: 1,
    createdAt: { $gte: date173DaysAgo },
  });

  const totalSpending = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const spendingScore = totalSpending / 1000;

  // Điều kiện giữ hạng hiện tại
  let enough = false;
  if (user.rank === 3 && spendingScore >= 60000) enough = true;
  else if (user.rank === 2 && spendingScore >= 30000) enough = true;
  else if (user.rank === 1 && spendingScore >= 15000) enough = true;
  else if (user.rank === 0 && spendingScore >= 5000) enough = true;

  if (!enough && user.email) {
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
    } catch (e) {
      console.error("Lỗi gửi email cảnh báo sắp tụt hạng:", e.message);
    }
  }
};

export const startRankJob = () => {
  // Chạy vào 0h mỗi ngày theo múi giờ Việt Nam
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        const users = await authModel.find({});
        for (const user of users) {
          await calculateRank(user);
          // Gửi cảnh báo nếu sắp tụt hạng
          await sendRankWarning(user);
        }
        console.log(
          `[${new Date().toLocaleString()}] ✅ Cron cập nhật rank cho tất cả user`
        );
      } catch (error) {
        console.error("❌ Cron lỗi cập nhật rank:", error.message);
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    }
  );
};
