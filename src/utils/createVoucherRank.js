import Voucher from "../models/voucher.model.js";
import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";

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


export const createVoucherRank = async (users, rank, monthKey) => {
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
    monthIssued: monthKey,
  });

  await voucher.save();
  console.log(
    `🎁 Đã tạo voucher cho ${filteredUsers.length} user lên hạng ${getRankName(
      rank
    )}`
  );
};


export const createVoucherMonthly = async (rank, monthKey) => {
  const monthlyRankConfig = {
    0: {
      voucherType: "shipping",
      discountType: "percent",
      discountValue: 100,
      maxDiscount: 30000,
      minOrderValues: 1000000,
    },
    1: {
      voucherType: "product",
      discountType: "percent",
      discountValue: 3,
      maxDiscount: 70000,
      minOrderValues: 1200000,
    },
    2: {
      voucherType: "product",
      discountType: "percent",
      discountValue: 5,
      maxDiscount: 150000,
      minOrderValues: 1500000,
    },
    3: {
      voucherType: "product",
      discountType: "percent",
      discountValue: 7,
      maxDiscount: 250000,
      minOrderValues: 2000000,
    },
  };

  const config = monthlyRankConfig[rank];
  if (!config) {
    return null;
  }

  const startDate = dayjs(`${monthKey}-01`).startOf("day").toDate();
  const endDate = dayjs(`${monthKey}-01`).add(6, "day").endOf("day").toDate();

  const codePrefix = {
    0: "BRONZE",
    1: "SILVER",
    2: "GOLD",
    3: "DIAMOND",
  };

  const code = `RANK-${codePrefix[rank]}-${monthKey.replace("-", "")}`;

  // Kiểm tra voucher đã tồn tại chưa
  const existed = await Voucher.findOne({ code, monthIssued: monthKey });
  if (existed) {
    console.log(`✅ Voucher ${code} đã tồn tại, không tạo lại.`);
    return existed;
  }

  // Tạo mới nếu chưa có
  const voucher = new Voucher({
    voucherType: config.voucherType,
    code,
    description: `Ưu đãi tháng cho hạng ${getRankName(rank)}`,
    discountType: config.discountType,
    discountValue: config.discountValue,
    maxDiscount: config.maxDiscount,
    minOrderValues: config.minOrderValues,
    quantity: 999999,
    startDate,
    endDate,
    voucherStatus: "active",
    monthIssued: monthKey,
  });

  await voucher.save();
  console.log(
    `🎁 Đã tạo voucher cho hạng ${getRankName(rank)}: ${voucher.code}`
  );
  return voucher;
};
