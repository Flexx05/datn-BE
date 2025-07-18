import Order from "../models/order.model.js";
import { getOrderStatisticsSchema } from "../validations/order-statistics.validation.js";

// Lấy ra đơn hàng để thống kê doanh thu
export const getOrderStatistics = async (req, res) => {
  const { error, value } = getOrderStatisticsSchema.validate(req.query, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Dữ liệu không hợp lệ",
      errors: error.details.map((e) => e.message),
    });
  }

  const now = new Date();
  const rawStart = value.startDate ? new Date(value.startDate) : null;
  const rawEnd = value.endDate ? new Date(value.endDate) : null;

  const startDate = rawStart
    ? new Date(rawStart.setHours(0, 0, 0, 0))
    : rawEnd
    ? new Date(new Date(rawEnd).setDate(rawEnd.getDate() - 7)).setHours(
        0,
        0,
        0,
        0
      )
    : new Date(now.setDate(now.getDate() - 7)).setHours(0, 0, 0, 0);

  const endDate = rawEnd
    ? new Date(new Date(rawEnd).setHours(23, 59, 59, 999))
    : new Date(new Date().setHours(23, 59, 59, 999));

  if (endDate < startDate) {
    return res.status(400).json({
      success: false,
      message: "Ngày kết thúc phải được chọn sau ngày bắt đầu",
    });
  }

  const filter = {
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    status: 4,
    paymentStatus: 1,
  };

  if (value.paymentMethod) {
    filter.paymentMethod = value.paymentMethod;
  }

  const page = parseInt(value.page, 10) || 1;
  const limit = parseInt(value.limit, 10) || 10;
  const skip = (page - 1) * limit;

  try {
    const [orders, totalDocs, allOrders] = await Promise.all([
      Order.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Order.countDocuments(filter),
      Order.find(filter), // lấy tất cả để tính tổng doanh thu
    ]);

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "Không có dữ liệu thống kê",
      });
    }

    // Tổng doanh thu
    const totalRevenue = allOrders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );
    const totalOrders = allOrders.length;
    const totalPages = Math.ceil(totalDocs / limit);

    // === THỐNG KÊ HÔM NAY ===
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Đơn hoàn thành và đã thanh toán hôm nay => tính doanh thu hôm nay
    const todayRevenueOrders = await Order.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: 4,
      paymentStatus: 1,
    });

    const todayRevenue = todayRevenueOrders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );

    // Đơn đã xác nhận hôm nay => tính số lượng đơn đặt hôm nay
    const todayOrdersCount = await Order.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: { $nin: [5, 6] }, // không tính đơn đã hủy hoặc hoàn trả
    });

    return res.json({
      success: true,
      totalOrders,
      totalRevenue,
      todayRevenue,
      todayOrdersCount,
      orders, // phân trang
      allOrders, // không phân trang, cho biểu đồ
      pagination: {
        totalDocs,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi. Vui lòng thử lại sau",
    });
  }
};
