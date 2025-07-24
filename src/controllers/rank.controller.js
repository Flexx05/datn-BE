import authModel from "../models/auth.model";
import orderModel from "../models/order.model";
import dayjs from "dayjs";

export const getCustomerRank = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await authModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    const date90DaysAgo = dayjs().subtract(90, "day").toDate();
    const orders = await orderModel.find({
      userId,
      status: 4,
      paymentStatus: 1,
      createdAt: { $gte: date90DaysAgo },
    });

    const totalOrders = orders.length;
    const totalSpending = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Xác định rank và điều kiện rank tiếp theo
    let calculatedRank = null;
    let requiredOrders = 1;
    let requiredSpending = 2_000_000;

    if (totalOrders >= 5 && totalSpending >= 20_000_000) {
      calculatedRank = 3;
      requiredOrders = null;
      requiredSpending = null;
    } else if (totalOrders >= 3 && totalSpending >= 10_000_000) {
      calculatedRank = 2;
      requiredOrders = 5;
      requiredSpending = 20_000_000;
    } else if (totalOrders >= 2 && totalSpending >= 5_000_000) {
      calculatedRank = 1;
      requiredOrders = 3;
      requiredSpending = 10_000_000;
    } else if (totalOrders >= 1 && totalSpending >= 2_000_000) {
      calculatedRank = 0;
      requiredOrders = 2;
      requiredSpending = 5_000_000;
    }

    // Logic giữ rank tối thiểu là Đồng (0) nếu đã từng đạt
    let rank = user.rank;
    if (user.rank === null) {
      // Người mới, chưa từng đạt rank
      rank = calculatedRank;
    } else {
      // Đã từng đạt rank >= 0
      if (calculatedRank === null) {
        // Không đủ điều kiện giữ rank hiện tại, tụt về thấp nhất là 0 (Đồng)
        rank = 0;
        requiredOrders = 2;
        requiredSpending = 5_000_000;
      } else {
        // Đủ điều kiện rank mới
        rank = calculatedRank;
      }
    }

    // Cập nhật DB nếu rank thay đổi
    if (user.rank !== rank) {
      await authModel.findByIdAndUpdate(userId, {
        rank,
        rankUpdatedAt: new Date(),
      });
    }

    const isMaxRank = rank === 3;
    const percent = isMaxRank
      ? 100
      : Math.min(
          100,
          Math.floor(
            Math.min(
              totalOrders / requiredOrders,
              totalSpending / requiredSpending
            ) * 100
          )
        );

    const daysLeft =
      90 - dayjs().diff(dayjs(orders[0]?.createdAt || date90DaysAgo), "day");

    return res.status(200).json({
      rank,
      orders: totalOrders,
      spending: totalSpending,
      requiredOrders,
      requiredSpending,
      percent,
      isMaxRank,
      daysLeft,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
