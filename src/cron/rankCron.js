import cron from "node-cron";
import authModel from "../models/auth.model.js";
import orderModel from "../models/order.model.js";
import dayjs from "dayjs";

const calculateRank = async (user) => {
  const userId = user._id;
  const date90DaysAgo = dayjs().subtract(90, "day").toDate();
  const orders = await orderModel.find({
    userId,
    status: 4,
    paymentStatus: 1,
    createdAt: { $gte: date90DaysAgo },
  });

  const totalOrders = orders.length;
  const totalSpending = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Logic mới đồng bộ với rank.controller.js
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

  if (user.rank !== rank) {
    await authModel.findByIdAndUpdate(userId, {
      rank,
      rankUpdatedAt: new Date(),
    });
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
