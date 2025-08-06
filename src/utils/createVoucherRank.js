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

const codePrefix = {
  0: "BRONZE",
  1: "SILVER",
  2: "GOLD",
  3: "DIAMOND",
};

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

  const createdVouchers = [];

  for (const user of users) {
    if (!user || user.isActive === false || user.role !== "user") continue;

    // Kiểm tra voucher rank-up của hạng này đã tồn tại chưa (cho user này)
    const existed = await Voucher.findOne({
      userIds: user._id,
      code: { $regex: `^RANKUP-${codePrefix[rank]}-`, $options: "i" },
    });

    if (existed) {
      console.log(
        `⚠️ User ${user._id} đã có voucher lên hạng ${getRankName(rank)}: ${
          existed.code
        }`
      );
      continue;
    }

    // Tạo mã voucher mới, kèm prefix hạng
    const code = `RANKUP-${codePrefix[rank]}-${uuidv4()
      .slice(0, 8)
      .toUpperCase()}`;

    const voucher = new Voucher({
      voucherType: "product",
      code,
      userIds: [user._id],
      description: `Ưu đãi đặc biệt khi lên hạng ${getRankName(rank)}`,
      discountType: "percent",
      discountValue: config.discountValue,
      maxDiscount: config.maxDiscount,
      minOrderValues: config.minOrderValues,
      quantity: 1,
      startDate: now,
      endDate: endDate,
      voucherStatus: "active",
      monthIssued: monthKey,
      isAuto: true, // Đánh dấu là voucher tự động
    });

    await voucher.save();
    createdVouchers.push({ user, voucher });
  }

  console.log(
    `🎁 Đã tạo ${
      createdVouchers.length
    } voucher cá nhân cho user lên hạng ${getRankName(rank)}`
  );

  return createdVouchers;
};

export const createVoucherMonthly = async (users, rank, monthKey) => {
  if (!Array.isArray(users) || users.length === 0) return;

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
  if (!config) return;

  const startDate = dayjs(`${monthKey}-01`).startOf("day").toDate();
  const endDate = dayjs(`${monthKey}-01`).add(6, "day").endOf("day").toDate();

  const code = `RANK-MONTHLY-${codePrefix[rank]}-${monthKey.replace("-", "")}`;

  // Tìm hoặc tạo voucher
  let voucher = await Voucher.findOne({ code, monthIssued: monthKey });
  if (voucher) {
    console.log(`✅ Voucher ${code} đã tồn tại, không tạo lại.`);
    return voucher;
  }

  if (!voucher) {
    voucher = new Voucher({
      voucherType: config.voucherType,
      code,
      description: `Ưu đãi tháng cho hạng ${getRankName(rank)}`,
      discountType: config.discountType,
      discountValue: config.discountValue,
      maxDiscount: config.maxDiscount,
      minOrderValues: config.minOrderValues,
      quantity: 0, // tạm thời để 0, sẽ cập nhật sau
      startDate,
      endDate,
      voucherStatus: "active",
      isAuto: true,
      monthIssued: monthKey,
      userIds: [],
    });

    await voucher.save();
    console.log(
      `🎁 Đã tạo voucher tháng cho hạng ${getRankName(rank)}: ${voucher.code}`
    );
  }

  let count = 0;

  for (const user of users) {
    if (!user || user.isActive === false || user.role !== "user") continue;

    const alreadyInList = await Voucher.exists({
      _id: voucher._id,
      userIds: user._id,
    });

    if (!alreadyInList) {
      await Voucher.updateOne(
        { _id: voucher._id },
        { $addToSet: { userIds: user._id } }
      );
      count++;
    }
  }

  // Sau khi gán xong, cập nhật lại quantity
  const updatedVoucher = await Voucher.findById(voucher._id).select("userIds");
  const updatedQuantity = updatedVoucher.userIds.length;

  await Voucher.updateOne(
    { _id: voucher._id },
    { $set: { quantity: updatedQuantity } }
  );

  console.log(
    `✅ Đã gán voucher tháng ${code} cho ${count} user hạng ${getRankName(
      rank
    )} | Tổng: ${updatedQuantity}`
  );
  return voucher;
};
