import Voucher from "../models/voucher.model.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Tạo 1 voucher dùng riêng cho mỗi người vừa lên 1 hạng cụ thể
 * @param {Array} users - danh sách user object (có _id, email, isActive)
 * @param {Number} rank - hạng mà người dùng vừa được lên
 */
export const createVoucherRank = async (users, rank) => {
  if (!Array.isArray(users) || users.length === 0) return;

  const rankConfig = {
    0: { discountValue: 5, maxDiscount: 100000, minOrderValues: 1000000 },
    1: { discountValue: 7, maxDiscount: 200000, minOrderValues: 1200000 },
    2: { discountValue: 10, maxDiscount: 300000, minOrderValues: 1500000 },
    3: { discountValue: 15, maxDiscount: 500000, minOrderValues: 2000000 },
  };

  const config = rankConfig[rank];
  if (!config) return;

  const now = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  // Lọc user đủ điều kiện: chưa từng nhận voucher này và còn active
  const filteredUsers = [];
  for (const user of users) {
    if (user?.isActive === false) continue; // Bỏ user không active

    const existed = await Voucher.findOne({
      userIds: user._id,
      description: { $regex: `hạng ${getRankName(rank)}`, $options: "i" },
    });

    if (!existed) filteredUsers.push(user);
  }

  if (filteredUsers.length === 0) return;

  const voucher = new Voucher({
    voucherType: "product",
    code: `RANKUP-${uuidv4().slice(0, 8).toUpperCase()}`,
    userIds: filteredUsers.map((u) => u._id),
    description: `Ưu đãi đặc biệt khi lên hạng ${getRankName(rank)}`,
    discountType: "percent",
    discountValue: config.discountValue,
    maxDiscount: config.maxDiscount,
    minOrderValues: config.minOrderValues,
    quantity: filteredUsers.length,
    startDate: now,
    endDate: endDate,
    voucherStatus: "active",
  });

  await voucher.save();
  console.log(
    `🎁 Đã tạo voucher cho ${
      filteredUsers.length
    } user lên hạng ${getRankName(rank)}`
  );
};

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
