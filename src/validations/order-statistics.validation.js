import Joi from "joi";

export const getOrderStatisticsSchema = Joi.object({
  // Ngày bắt đầu thống kê (tùy chọn, mặc định 7 ngày trước)
  startDate: Joi.date().optional().messages({
    "date.base": "Ngày bắt đầu không hợp lệ",
  }),
  // Ngày kết thúc thống kê (tùy chọn, mặc định ngày hôm nay)
  endDate: Joi.date().optional().messages({
    "date.base": "Ngày kết thúc không hợp lệ",
  }),
  paymentMethod: Joi.string().valid("COD", "VNPAY").optional().messages({
    "string.base": "Phương thức thanh toán không hợp lệ",
    "any.only": "Phương thức thanh toán chỉ được là 'COD' hoặc 'VNPAY'",
  }),
  page: Joi.number().integer().min(1).optional(), // 👈 THÊM DÒNG NÀY
  limit: Joi.number().integer().min(1).optional(),
});
