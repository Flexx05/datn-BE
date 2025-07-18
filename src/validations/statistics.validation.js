import Joi from "joi";

// Schema validation cho chức năng thống kê sản phẩm bán chạy
// Lưu ý: Chỉ thống kê sản phẩm từ đơn hàng HOÀN THÀNH (trạng thái 4) và ĐÃ THANH TOÁN
export const getTopProductsSchema = Joi.object({
  // Ngày bắt đầu thống kê (tùy chọn, mặc định 7 ngày trước)
  startDate: Joi.date().optional().messages({
    "date.base": "Ngày bắt đầu không hợp lệ",
  }),
  // Ngày kết thúc thống kê (tùy chọn, mặc định ngày hôm nay)
  endDate: Joi.date().optional().messages({
    "date.base": "Ngày kết thúc không hợp lệ",
  }),
  // ID danh mục sản phẩm (tùy chọn - để lọc theo danh mục)
  categoryId: Joi.string().optional().messages({
    "string.base": "ID danh mục không hợp lệ",
  }),
  // ID thương hiệu (tùy chọn - để lọc theo thương hiệu)
  brandId: Joi.string().optional().messages({
    "string.base": "ID thương hiệu không hợp lệ",
  }),
  // Số lượng sản phẩm top muốn hiển thị (tùy chọn, mặc định 10, tối đa 100)
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .messages({
      "number.base": "Số lượng hiển thị phải là số",
      "number.integer": "Số lượng hiển thị phải là số nguyên",
      "number.min": "Số lượng hiển thị tối thiểu là 1",
      "number.max": "Số lượng hiển thị tối đa là 100",
    }),
  page: Joi.number().integer().min(1).optional().default(1).messages({
    "number.base": "Trang phải là số",
    "number.integer": "Trang phải là số nguyên",
    "number.min": "Trang tối thiểu là 1",
  }),
});
