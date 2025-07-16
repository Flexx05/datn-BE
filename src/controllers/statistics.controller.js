import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { getTopProductsSchema } from "../validations/statistics.validation.js";

export const getTopProducts = async (req, res) => {
  const { error, value } = getTopProductsSchema.validate(req.query, {
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
    ? new Date(
        rawStart.getFullYear(),
        rawStart.getMonth(),
        rawStart.getDate(),
        0,
        0,
        0,
        0
      )
    : rawEnd
    ? new Date(
        rawEnd.getFullYear(),
        rawEnd.getMonth(),
        rawEnd.getDate() - 7,
        0,
        0,
        0,
        0
      )
    : new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 7,
        0,
        0,
        0,
        0
      );

  const endDate = rawEnd
    ? new Date(
        rawEnd.getFullYear(),
        rawEnd.getMonth(),
        rawEnd.getDate(),
        23,
        59,
        59,
        999
      )
    : new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );

  const { categoryId, brandId, limit = 10 } = value;

  try {
    const orders = await Order.find({
      paymentStatus: 1,
      status: 4,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "Không có dữ liệu đơn hàng để thống kê",
      });
    }

    const productStats = {};
    const uniqueOrderIds = new Set();

    // Duyệt qua từng đơn hàng để thống kê sản phẩm
    for (const order of orders) {
      const seenProducts = new Set(); // Để đảm bảo mỗi sản phẩm chỉ được tính 1 lần cho orderCount
      uniqueOrderIds.add(order._id.toString());

      const discountAmount = order.discountAmount || 0;
      const totalItemAmount = order.items.reduce(
        (sum, item) => sum + (item.totalPrice || 0),
        0
      );

      for (const item of order.items) {
        const productId = item.productId?.toString();
        if (!productId) continue;

        if (!productStats[productId]) {
          productStats[productId] = {
            quantity: 0,
            revenue: 0,
            orderCount: 0,
          };
        }

        const itemTotal = item.totalPrice || 0;

        // Phân bổ giảm giá theo tỷ lệ nếu có voucher hoặc giảm giá
        const itemDiscount =
          totalItemAmount > 0
            ? (itemTotal / totalItemAmount) * discountAmount
            : 0;

        const revenueAfterDiscount = itemTotal - itemDiscount;

        productStats[productId].quantity += item.quantity;
        productStats[productId].revenue += revenueAfterDiscount;
        seenProducts.add(productId);
      }

      // Tăng số đơn hàng chứa sản phẩm
      seenProducts.forEach((id) => {
        productStats[id].orderCount += 1;
      });
    }

    const productIds = Object.keys(productStats);
    let products = await Product.find({ _id: { $in: productIds } });

    if (categoryId) {
      products = products.filter((p) => String(p.categoryId) === categoryId);
    }
    if (brandId) {
      products = products.filter((p) => String(p.brandId) === brandId);
    }

    const totalQuantity = Object.values(productStats).reduce(
      (sum, s) => sum + s.quantity,
      0
    );

    const result = products
      .map((p) => {
        const stat = productStats[p._id.toString()];
        const totalStock = (p.variation || []).reduce(
          (sum, v) => sum + (v.stock || 0),
          0
        );
        return {
          id: p._id, // ID của sản phẩm
          name: p.name, // Tên sản phẩm
          image: p.image?.[0] || null, // Ảnh đại diện sản phẩm (ảnh đầu tiên hoặc null nếu không có)
          category: p.categoryName || null, // Tên danh mục (nếu có)
          brand: p.brandName || null, // Tên thương hiệu (nếu có)
          quantity: stat.quantity, // Tổng số lượng sản phẩm đã bán trong khoảng thời gian lọc
          revenue: stat.revenue, // Tổng doanh thu từ sản phẩm (sau giảm giá nếu có)
          unitPrice:
            stat.quantity > 0 ? Math.round(stat.revenue / stat.quantity) : 0, // Đơn giá trung bình = doanh thu / số lượng (làm tròn số nguyên)
          orderCount: stat.orderCount || 0, // Tổng số đơn hàng chứa sản phẩm này
          soldPercentage:
            totalQuantity > 0
              ? parseFloat(((stat.quantity / totalQuantity) * 100).toFixed(2))
              : 0, // Tỷ lệ bán = (số lượng sản phẩm này / tổng tất cả) * 100 (%)
          currentPrice:
            p.variation?.[0]?.salePrice || p.variation?.[0]?.regularPrice || 0, // Giá hiện tại của sản phẩm (ưu tiên salePrice nếu có)
          totalStock, // Tổng số lượng tồn kho của tất cả các phiên bản sản phẩm
        };
      })
      .sort((a, b) => b.quantity - a.quantity);

    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: "Không có sản phẩm bán chạy trong khoảng thời gian này",
      });
    }

    return res.json({
      success: true,
      docs: result, // Danh sách các sản phẩm bán chạy (đã lọc và tính toán đầy đủ thông tin)
      totalDocs: result.length, // Tổng số sản phẩm bán được trong khoảng thời gian lọc
      totalRevenue: result.reduce((sum, p) => sum + p.revenue, 0), // Tổng doanh thu của tất cả sản phẩm (đã trừ giảm giá)
      totalQuantity: result.reduce((sum, p) => sum + p.quantity, 0), // Tổng số lượng sản phẩm đã bán (cộng dồn từ các sản phẩm)
      totalOrderCount: uniqueOrderIds.size, // Tổng số đơn hàng có ít nhất một sản phẩm bán ra (không trùng đơn hàng)
      limit,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi. Vui lòng thử lại",
    });
  }
};
