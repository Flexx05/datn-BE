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
    0: { discountValue: 5, maxDiscount: 100000, minOrderValues: 1200000 },
    1: { discountValue: 7, maxDiscount: 200000, minOrderValues: 1500000 },
    2: { discountValue: 10, maxDiscount: 300000, minOrderValues: 1800000 },
    3: { discountValue: 15, maxDiscount: 500000, minOrderValues: 2500000 },
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
      isAuto: true,
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
      vouchers: [
        {
          voucherType: "shipping",
          discountType: "percent",
          discountValue: 100,
          maxDiscount: 50000,
          minOrderValues: 1000000,
        },
      ],
    },
    1: {
      vouchers: [
        {
          voucherType: "product",
          discountType: "percent",
          discountValue: 3,
          maxDiscount: 70000,
          minOrderValues: 1200000,
        },
        {
          voucherType: "shipping",
          discountType: "percent",
          discountValue: 100,
          maxDiscount: 30000,
          minOrderValues: 1200000,
        },
      ],
    },
    2: {
      vouchers: [
        {
          voucherType: "product",
          discountType: "percent",
          discountValue: 5,
          maxDiscount: 150000,
          minOrderValues: 1500000,
        },
        {
          voucherType: "shipping",
          discountType: "percent",
          discountValue: 100,
          maxDiscount: 30000,
          minOrderValues: 1500000,
        },
      ],
    },
    3: {
      vouchers: [
        {
          voucherType: "product",
          discountType: "percent",
          discountValue: 7,
          maxDiscount: 250000,
          minOrderValues: 2000000,
        },
        {
          voucherType: "shipping",
          discountType: "percent",
          discountValue: 100,
          maxDiscount: 50000,
          minOrderValues: 2000000,
        },
      ],
    },
  };

  const configs = monthlyRankConfig[rank]?.vouchers;
  if (!configs || configs.length === 0) return;

  const allVouchers = [];
  const MAX_USERS = 10000; // mỗi voucher tối đa 10.000 user

  for (const cfg of configs) {
    const startDate = dayjs(`${monthKey}-01`).startOf("day").toDate();
    const endDate = dayjs(`${monthKey}-01`).add(6, "day").endOf("day").toDate();

    // Chia users thành nhiều chunks
    let chunks = [];
    for (let i = 0; i < users.length; i += MAX_USERS) {
      chunks.push(users.slice(i, i + MAX_USERS));
    }

    const totalParts = chunks.length; // tổng số part
    let part = 1;
    for (const chunk of chunks) {
      if (!chunk || chunk.length === 0) continue;

      // chỉ thêm P{part} nếu có nhiều part
      let code = `RANK-MONTHLY-${
        codePrefix[rank]
      }-${cfg.voucherType.toUpperCase()}-${monthKey.replace("-", "")}`;
      if (totalParts > 1) {
        code += `-P${part}`;
      }

      // Kiểm tra voucher này đã tồn tại chưa
      let voucher = await Voucher.findOne({ code, monthIssued: monthKey, isAuto: true });
      if (!voucher) {
        voucher = new Voucher({
          voucherType: cfg.voucherType,
          code,
          description: `Ưu đãi tháng cho hạng ${getRankName(rank)} (${
            cfg.voucherType === "shipping" ? "Freeship" : "Giảm giá"
          })${totalParts > 1 ? ` - Part ${part}` : ""}`,
          discountType: cfg.discountType,
          discountValue: cfg.discountValue,
          maxDiscount: cfg.maxDiscount,
          minOrderValues: cfg.minOrderValues,
          quantity: 0,
          startDate,
          endDate,
          voucherStatus: "active",
          isAuto: true,
          monthIssued: monthKey,
          userIds: [],
        });
        await voucher.save();
      } else {
        console.log(`✅ Voucher ${code} đã tồn tại, không tạo lại.`);
        allVouchers.push(voucher); // vẫn thêm vào danh sách trả về
        continue;
      }

      let count = 0;
      for (const user of chunk) {
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

      const updatedVoucher = await Voucher.findById(voucher._id).select(
        "userIds"
      );
      await Voucher.updateOne(
        { _id: voucher._id },
        { $set: { quantity: updatedVoucher.userIds.length } }
      );

      console.log(
        `✅ Voucher ${code}${
          part > 1 ? ` (Part ${part})` : ""
        } phát cho ${count} user | Tổng: ${updatedVoucher.userIds.length}`
      );

      allVouchers.push(voucher);
      part++;
    }
  }

  return allVouchers;
};
