import authModel from "../models/auth.model.js";
import orderModel from "../models/order.model.js";
import dayjs from "dayjs";
import { sendMail } from "../utils/sendMail.js";
import { createVoucherRank } from "../utils/createVoucherRank.js";

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
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    // --- Tính chi tiêu 90 ngày gần nhất ---
    const date90DaysAgo = dayjs().subtract(90, "day").toDate();
    const orders = await orderModel.find({
      userId,
      status: 4,
      paymentStatus: 1,
      createdAt: { $gte: date90DaysAgo },
    });

    const totalSpending = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const spendingScore = Math.floor(totalSpending / 1000);

    // --- Xác định rank mới ---
    let calculatedRank = null;
    if (spendingScore >= 30000) calculatedRank = 3;
    else if (spendingScore >= 15000) calculatedRank = 2;
    else if (spendingScore >= 7000) calculatedRank = 1;
    else if (spendingScore >= 3000) calculatedRank = 0;

      let rank = user.rank;
      const lastOrderDate = orders[0]?.createdAt;
      const hasNewOrder =
        lastOrderDate &&
        (!user.rankUpdatedAt ||
          dayjs(lastOrderDate).isAfter(user.rankUpdatedAt));

      if (rank === null) {
        rank = calculatedRank;
      } else {
        if (calculatedRank === null || calculatedRank < user.rank) {
          // Chỉ tụt nếu có đơn mới kể từ lần cập nhật rank trước
          if (hasNewOrder) {
            rank = Math.max(0, user.rank - 1);
          } else {
            rank = user.rank; // Giữ nguyên hạng nếu không có đơn mới
          }
        } else if (calculatedRank > user.rank) {
          rank = calculatedRank;
        } else {
          rank = user.rank;
        }
      }

    // --- Nếu có thay đổi rank ---
    if (rank !== user.rank) {
      await authModel.findByIdAndUpdate(userId, {
        rank,
        rankUpdatedAt: new Date(),
      });

      let subject = "";
      let html = "";

      if (rank > (user.rank ?? -1)) {
        subject = "🎉 Chúc mừng bạn đã lên hạng!";
        const vouchers = await createVoucherRank([user], rank);
        const voucher = vouchers?.[0]?.voucher;

        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #4CAF50;">${subject}</h2>
            <p>Xin chào <strong>${user.fullName || user.email}</strong>,</p>
            <p>Chúc mừng bạn đã được <strong>thăng hạng lên ${getRankName(
              rank
            )}</strong> 🎉</p>

            ${
              voucher
                ? `
                <p>Hãy tận hưởng ưu đãi đặc biệt dành riêng cho bạn ở cấp bậc mới này!</p>
              <div style="margin-top: 24px; padding: 16px; background-color: #f9f9f9; border-left: 4px solid #4CAF50;">
                <p><strong>Mã ưu đãi:</strong> ${voucher.code}</p>
                <p><strong>Giảm:</strong> ${
                  voucher.discountType === "fixed"
                    ? `${voucher.discountValue.toLocaleString()}đ`
                    : `${
                        voucher.discountValue
                      }% (tối đa ${voucher.maxDiscount.toLocaleString()}đ)`
                }</p>
                <p><strong>Đơn tối thiểu:</strong> ${voucher.minOrderValues.toLocaleString()}đ</p>
                <p><strong>Hạn dùng:</strong> đến ${dayjs(
                  voucher.endDate
                ).format("DD/MM/YYYY")}</p>
              </div>
              <div style="text-align:center; margin-top: 24px;">
                <a href="http://localhost:5174/products" style="display:inline-block; background-color:#4CAF50; color:white; padding:12px 24px; border-radius:4px; text-decoration:none;">Sử dụng ngay</a>
              </div>
            `
                : ""
            }
             <p style="margin-top: 24px;">Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.</p>
            <p style="margin-top: 32px;">Trân trọng,<br/> <strong>Binova Shop</strong><br/> <i>Chăm sóc khách hàng</i></p>
            <hr style="margin: 24px 0;" />
            <p style="font-size: 12px; color: #999;">Đây là email tự động, vui lòng không trả lời lại.</p>
          </div>
        `;
      } else if (rank < user.rank && user.rank > 0) {
        subject = "⚠️ Bạn đã bị tụt hạng";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #ff4d4f; margin-bottom: 16px;">${subject}</h2>

            <p>Xin chào <strong>${user.fullName || user.email}</strong>,</p>

            <p>Chúng tôi muốn thông báo rằng bạn đã bị <strong>hạ xuống hạng ${getRankName(
              rank
            )}</strong> vì chưa đạt đủ mức chi tiêu cần thiết trong vòng 90 ngày qua.</p>

            <p>Hãy quay lại và tiếp tục mua sắm để nhanh chóng lấy lại hạng của mình và tận hưởng những ưu đãi hấp dẫn dành riêng cho bạn!</p>

            <div style="text-align:center; margin-top: 24px;">
                <a href="http://localhost:5174/products" style="display:inline-block; background-color:#ff9800; color:white; padding:12px 24px; border-radius:4px; text-decoration:none;">Lấy lại hạng ngay</a>
            </div>

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

      if (subject && user?.email && user?.isActive !== false) {
        try {
          await sendMail({ to: user.email, subject, html });
        } catch (e) {
          console.error("Lỗi gửi mail rank:", e.message);
        }
      }
    }

    // --- Tính thêm các thông tin để trả về ---
    const nextThresholds = [3000, 7000, 15000, 30000];
    const isMaxRank = rank === 3;
    const nextThreshold = rank < 3 ? nextThresholds[rank + 1] : null;
    const percent = isMaxRank
      ? 100
      : Math.min(100, Math.floor((spendingScore / nextThreshold) * 100));

    const daysLeft =
      90 - dayjs().diff(dayjs(orders[0]?.createdAt || date90DaysAgo), "day");

    return res.status(200).json({
      rank,
      spending: totalSpending,
      points: spendingScore,
      isMaxRank,
      percent,
      daysLeft,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
