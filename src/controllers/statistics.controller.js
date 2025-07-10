import { Order } from "../models/order.model.js";
import { productModel } from "../models/product.model.js";
import { getTopProductsSchema } from "../validations/statistics.validation.js";

/**
 * Controller thống kê sản phẩm bán chạy
 * Lấy danh sách sản phẩm có số lượng bán ra nhiều nhất trong khoảng thời gian xác định
 *
 * Lưu ý: Chỉ thống kê sản phẩm từ đơn hàng HOÀN THÀNH (trạng thái 4) và ĐÃ THANH TOÁN
 * - Trạng thái 4: Hoàn thành ✅ (đã bán thành công và hoàn tất)
 * - PaymentStatus 1: Đã thanh toán ✅
 *
 * Thời gian mặc định: 30 ngày gần nhất nếu không được chỉ định
 */
export const getTopProducts = async (req, res) => {
  try {
    // Validate dữ liệu đầu vào với Joi schema
    const { error, value } = getTopProductsSchema.validate(req.query, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((e) => e.message),
      });
    }

    // Lấy các tham số đã được validate
    const {
      startDate,
      endDate,
      categoryId,
      brandId,
      _page = 1,
      _limit = 10,
      _sort = "createdAt",
      _order,
    } = value;

    const options = {
      page: parseInt(_page, 10),
      limit: parseInt(_limit, 10),
      sort: { [_sort]: _order === "desc" ? -1 : 1 },
    };

    // Xử lý giá trị mặc định cho thời gian nếu không được nhập
    const end = endDate ? new Date(endDate) : new Date(); // Mặc định ngày hôm nay
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); // Mặc định 7 ngày trước nếu không có startDate

    // Kiểm tra logic ngày bắt đầu và kết thúc
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu không được lớn hơn ngày kết thúc",
      });
    }

    // Xây dựng điều kiện lọc đơn hàng
    // Chỉ lấy đơn hàng đã thanh toán và HOÀN THÀNH (trạng thái 4)
    const orderMatchConditions = {
      createdAt: {
        $gte: start,
        $lte: end,
      },
      paymentStatus: 1, // Đã thanh toán
      status: 4, // Hoàn thành - chỉ đơn hàng hoàn thành mới được tính vào thống kê bán chạy
    };

    // Aggregate để tính tổng số lượng bán và doanh thu theo sản phẩm
    const orderData = await Order.aggregate([
      { $match: orderMatchConditions }, // Lọc theo điều kiện
      { $unwind: "$items" }, // Tách từng item trong đơn hàng
      {
        $group: {
          _id: "$items.productId", // Nhóm theo productId
          totalQuantity: { $sum: "$items.quantity" }, // Tổng số lượng bán
          totalRevenue: { $sum: "$items.totalPrice" }, // Tổng doanh thu
          orderCount: { $sum: 1 }, // Số đơn hàng chứa sản phẩm này
        },
      },
      { $sort: { totalQuantity: -1 } }, // Sắp xếp giảm dần theo số lượng
      { $skip: (options.page - 1) * options.limit },
      { $limit: options.limit },
    ]);

    // Kiểm tra có dữ liệu đơn hàng không
    if (!orderData || orderData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không có dữ liệu đơn hàng để thống kê",
      });
    }

    // Lấy danh sách ID sản phẩm từ kết quả aggregate
    const productIds = orderData.map((item) => item._id);

    // Xây dựng điều kiện lọc sản phẩm
    const productMatchConditions = {
      _id: { $in: productIds },
      isActive: true, // Chỉ lấy sản phẩm đang hoạt động
    };

    // Thêm điều kiện lọc theo danh mục nếu có
    if (categoryId) {
      productMatchConditions.categoryId = categoryId;
    }

    // Thêm điều kiện lọc theo thương hiệu nếu có
    if (brandId) {
      productMatchConditions.brandId = brandId;
    }

    // Lấy thông tin chi tiết sản phẩm
    const products = await productModel
      .find(productMatchConditions)
      .select("name image brandName categoryName variation")
      .lean();

    // Kiểm tra có sản phẩm nào không
    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không có sản phẩm bán chạy trong khoảng thời gian này",
      });
    }

    // Kết hợp dữ liệu đơn hàng với thông tin sản phẩm
    const result = orderData
      .map((orderItem) => {
        const product = products.find(
          (p) => p._id.toString() === orderItem._id.toString()
        );
        if (!product) return null;

        // Lấy variation đầu tiên để tham khảo giá
        const firstVariation =
          product.variation && product.variation.length > 0
            ? product.variation[0]
            : { regularPrice: 0, salePrice: 0 };

        return {
          productId: orderItem._id,
          name: product.name,
          image:
            product.image && product.image.length > 0 ? product.image[0] : null,
          brandName: product.brandName,
          categoryName: product.categoryName,
          quantitySold: orderItem.totalQuantity, // Số lượng đã bán
          totalRevenue: orderItem.totalRevenue, // Tổng doanh thu
          averagePrice: orderItem.totalRevenue / orderItem.totalQuantity, // Giá trung bình
          regularPrice: firstVariation.regularPrice, // Giá gốc
          orderCount: orderItem.orderCount, // Số đơn hàng chứa sản phẩm
        };
      })
      .filter((item) => item !== null);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không có sản phẩm bán chạy trong khoảng thời gian này",
      });
    }

    return res.status(200).json({
      message: "Thống kê sản phẩm bán chạy thành công",
      docs: result,
      totalDocs: result.length,
      total: result.length,
      page: options.page,
      limit: options.limit,
    });
  } catch (error) {
    console.error("Error in getTopProducts:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi. Vui lòng thử lại",
    });
  }
};
