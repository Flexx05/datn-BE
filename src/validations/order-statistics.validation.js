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
  page: Joi.number().integer().min(1).optional(),
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
});
