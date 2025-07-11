import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { getTopProductsSchema } from "../validations/statistics.validation.js";

export const getTopProducts = async (req, res) => {
  const { error, value } = getTopProductsSchema.validate(req.query, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Dữ liệu không hợp lệ",
      errors: error.details.map((e) => e.message),
    });
  }

  const now = new Date();
  const startDate = value.startDate
    ? new Date(value.startDate)
    : value.endDate
    ? new Date(new Date(value.endDate).getTime() - 7 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const endDate = value.endDate ? new Date(value.endDate) : now;

  if (startDate > endDate) {
    return res.status(400).json({
      success: false,
      message: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc",
    });
  }

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

    for (const order of orders) {
      const seenProducts = new Set();

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

        productStats[productId].quantity += item.quantity;
        productStats[productId].revenue += item.totalPrice;
        seenProducts.add(productId);
      }

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
        return {
          id: p._id,
          name: p.name,
          image: p.image?.[0] || null,
          category: p.categoryName || null,
          brand: p.brandName || null,
          quantity: stat.quantity,
          revenue: stat.revenue,
          unitPrice:
            stat.quantity > 0 ? Math.round(stat.revenue / stat.quantity) : 0,
          orderCount: stat.orderCount || 0,
          soldPercentage:
            totalQuantity > 0
              ? parseFloat(((stat.quantity / totalQuantity) * 100).toFixed(2))
              : 0,
          price:
            p.variation?.[0]?.salePrice || p.variation?.[0]?.regularPrice || 0,
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);

    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: "Không có sản phẩm bán chạy trong khoảng thời gian này",
      });
    }

    return res.json({
      success: true,
      docs: result,
      totalDocs: result.length,
      totalRevenue: result.reduce((sum, p) => sum + p.revenue, 0),
      totalQuantity: result.reduce((sum, p) => sum + p.quantity, 0),
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
