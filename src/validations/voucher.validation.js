import Joi from "joi";

// Schema dùng để tạo mới voucher
const createVoucherSchema = Joi.object({
  voucherType: Joi.string()
    .valid("product", "shipping")
    .required()
    .messages({
      "any.required": "Loại voucher là bắt buộc (product hoặc shipping)",
      "any.only": "Loại voucher chỉ có thể là 'product' hoặc 'shipping'",
    }),

  code: Joi.string().required().messages({
    "any.required": "Mã giảm giá là bắt buộc",
  }),

  link: Joi.string().uri().required().messages({
    "any.required": "Link giảm giá là bắt buộc",
    "string.uri": "Link phải đúng định dạng URL",
  }),

  description: Joi.string().required().messages({
    "any.required": "Mô tả giảm giá là bắt buộc",
  }),

  discountType: Joi.string()
    .valid("fixed", "percent")
    .required()
    .messages({
      "any.required": "Kiểu giảm giá là bắt buộc",
      "any.only": "Chỉ chấp nhận 'fixed' hoặc 'percent'",
    }),

  discountValue: Joi.number().min(0).required().messages({
    "any.required": "Giá trị giảm giá là bắt buộc",
    "number.base": "Giá trị giảm phải là số",
  }),

  minOrderValues: Joi.number().min(0).required().messages({
    "any.required": "Giá trị đơn hàng tối thiểu là bắt buộc",
    "number.base": "Giá trị đơn hàng tối thiểu phải là số",
  }),

  maxDiscount: Joi.number().min(0).required().messages({
    "any.required": "Số tiền giảm tối đa là bắt buộc",
    "number.base": "Số tiền giảm tối đa phải là số",
  }),

  quantity: Joi.number().min(1).required().messages({
    "any.required": "Số lượng voucher là bắt buộc",
    "number.min": "Số lượng phải ít nhất là 1",
  }),

  used: Joi.number().min(0).optional(),

  startDate: Joi.date().required().messages({
    "any.required": "Ngày bắt đầu là bắt buộc",
    "date.base": "Ngày bắt đầu không hợp lệ",
  }),

  endDate: Joi.date()
    .greater(Joi.ref("startDate"))
    .required()
    .messages({
      "any.required": "Ngày kết thúc là bắt buộc",
      "date.greater": "Ngày kết thúc phải sau ngày bắt đầu",
    }),

  voucherStatus: Joi.string()
    .valid("active", "inactive", "expired")
    .optional()
    .messages({
      "any.only": "Trạng thái chỉ có thể là: active, inactive hoặc expired",
    }),
});


// Validate cập nhật voucher
const updateVoucherSchema = Joi.object({
  voucherType: Joi.string().valid("product", "shipping").optional(),
  link: Joi.string().uri().optional(),
  code:Joi.string().optional(),
  description: Joi.string().optional(),
  discountType: Joi.string().valid("fixed", "percent").optional(),
  discountValue: Joi.number().min(0).optional(),
  minOrderValues: Joi.number().min(0).optional(),
  maxDiscount: Joi.number().min(0).optional(),
  quantity: Joi.number().min(1).optional(),
  used: Joi.number().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date()
    .greater(Joi.ref("startDate"))
    .optional(),
  voucherStatus: Joi.string().valid("active", "inactive", "expired").optional(),
});

export { createVoucherSchema, updateVoucherSchema};
