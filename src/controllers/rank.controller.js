import authModel from "../models/auth.model";
import orderModel from "../models/order.model";
import dayjs from "dayjs";
import { sendMail } from "../utils/sendMail";

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

export const getCustomerRank = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await authModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    const date180DaysAgo = dayjs().subtract(180, "day").toDate();
    const orders = await orderModel.find({
      userId,
      status: 4,
      paymentStatus: 1,
      createdAt: { $gte: date180DaysAgo },
    });

    const totalSpending = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Tính rank dựa trên tổng chi tiêu / 1000
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

    // Cập nhật DB nếu rank thay đổi
    if (user.rank !== rank) {
      await authModel.findByIdAndUpdate(userId, {
        rank,
        rankUpdatedAt: new Date(),
      });

      // Gửi email thông báo thay đổi hạng
      let subject = "";
      let text = "";
      if (rank > user.rank) {
        subject = "🎉 Chúc mừng bạn đã lên hạng!";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #4CAF50;">${subject}</h2>
            <p>Xin chào <strong>${user.fullName || user.email}</strong>,</p>
            <p>Chúc mừng bạn đã được <strong>thăng hạng lên ${getRankName(
              rank
            )}</strong> 🎉</p>
            <p>Hãy tận hưởng các ưu đãi đặc biệt dành riêng cho bạn ở cấp bậc mới này!</p>

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
      } else if (rank < user.rank && user.rank > 0 && user.rank != null) {
        subject = "⚠️ Bạn đã bị tụt hạng";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #ff4d4f; margin-bottom: 16px;">${subject}</h2>

            <p>Xin chào <strong>${user.fullName || user.email}</strong>,</p>

            <p>Chúng tôi muốn thông báo rằng bạn đã bị <strong>hạ xuống hạng ${getRankName(
              rank
            )}</strong> vì chưa đạt đủ mức chi tiêu cần thiết trong vòng 6 tháng qua.</p>

            <p>Hãy quay lại và tiếp tục mua sắm để nhanh chóng lấy lại hạng của mình và tận hưởng những ưu đãi hấp dẫn dành riêng cho bạn!</p>

            <p style="margin-top: 24px;">Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.</p>

            <p style="margin-top: 32px;">
              Trân trọng,<br/>
              <strong>Binova Shop</strong><br/>
              <i>Chăm sóc khách hàng</i>
            </p>

            <hr style="margin: 24px 0;" />
            <p style="font-size: 12px; color: #999;">Đây là email tự động, vui lòng không trả lời lại email này.</p>
          </div>
        `;
      }

      if (subject && text && user.email) {
        try {
          await sendMail(user.email, subject, text);
        } catch (e) {
          console.error("Lỗi gửi email thông báo thay đổi hạng:", e.message);
        }
      }
    }

    const isMaxRank = rank === 3;
    const nextThresholds = [5000, 15000, 30000, 60000];
    const nextThreshold = rank < 3 ? nextThresholds[rank + 1] : null;
    const percent = isMaxRank
      ? 100
      : Math.min(100, Math.floor((spendingScore / nextThreshold) * 100));

    const daysLeft =
      180 - dayjs().diff(dayjs(orders[0]?.createdAt || date180DaysAgo), "day");

    return res.status(200).json({
      rank, // Hạng hiện tại của người dùng (0–3)
      spending: totalSpending, // Tổng chi tiêu trong 90 ngày gần nhất (VND)
      points: spendingScore, // Số điểm đạt được = spending / 1000
      isMaxRank, // Đã đạt hạng cao nhất chưa (true nếu rank = 3)
      percent, // % tiến độ đạt đến rank tiếp theo
      daysLeft, // Số ngày còn lại trong chu kỳ 90 ngày
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
