import Joi from "joi";

// Schema dùng để tạo mới voucher
const createVoucherSchema = Joi.object({
  voucherType: Joi.string().valid("product", "shipping").required().messages({
    "any.required": "Loại voucher là bắt buộc (product hoặc shipping)",
    "any.only": "Loại voucher chỉ có thể là 'product' hoặc 'shipping'",
  }),

  code: Joi.string().required().messages({
    "any.required": "Mã giảm giá là bắt buộc",
  }),

  userIds: Joi.array().items(Joi.string()).max(10000).optional().messages({
    "array.unique": "Danh sách user không được chứa trùng lặp",
    "array.max": "Danh sách userIds không được vượt quá 10.000",
  }),

  description: Joi.string().required().messages({
    "any.required": "Mô tả giảm giá là bắt buộc",
  }),

  discountType: Joi.string().valid("fixed", "percent").required().messages({
    "any.required": "Kiểu giảm giá là bắt buộc",
    "any.only": "Chỉ chấp nhận 'fixed' hoặc 'percent'",
  }),

  discountValue: Joi.number()
    .min(0)
    .required()
    .when("discountType", {
      is: "fixed",
      then: Joi.number().max(10000000),
      otherwise: Joi.number().max(100),
    })
    .messages({
      "any.required": "Giá trị giảm giá là bắt buộc",
      "number.base": "Giá trị giảm phải là số",
      "number.max": "Giá trị giảm vượt quá giới hạn cho phép",
    }),

  minOrderValues: Joi.number()
    .max(100000000)
    .required()
    .when("voucherType", {
      is: "shipping",
      then: Joi.number().min(0).messages({
        "number.min": "Giá trị đơn hàng tối thiểu cho shipping phải >= 0",
        "number.max":
          "Giá trị đơn hàng tối thiểu không được vượt quá 100.000.000",
        "any.required": "Giá trị đơn hàng tối thiểu là bắt buộc",
        "number.base": "Giá trị đơn hàng tối thiểu phải là số",
      }),
      otherwise: Joi.number().min(1).messages({
        "number.min": "Giá trị đơn hàng tối thiểu phải ít nhất là 1",
        "number.max":
          "Giá trị đơn hàng tối thiểu không được vượt quá 100.000.000",
        "any.required": "Giá trị đơn hàng tối thiểu là bắt buộc",
        "number.base": "Giá trị đơn hàng tối thiểu phải là số",
      }),
    }),

  maxDiscount: Joi.when("discountType", {
    is: "percent",
    then: Joi.number().min(1).max(10000000).required().messages({
      "any.required": "Số tiền giảm tối đa là bắt buộc khi giảm theo phần trăm",
      "number.min": "Số tiền giảm tối đa phải lớn hơn hoặc bằng 1",
      "number.max": "Số tiền giảm tối đa không được vượt quá 10.000.000",
    }),
    otherwise: Joi.forbidden(),
  }),

  quantity: Joi.number().min(1).max(100000).required().messages({
    "any.required": "Số lượng voucher là bắt buộc",
    "number.min": "Số lượng phải ít nhất là 1",
    "number.max": "Số lượng voucher không được vượt quá 100.000",
  }),

  used: Joi.number().min(0).optional(),

  startDate: Joi.date().required().messages({
    "any.required": "Ngày bắt đầu là bắt buộc",
    "date.base": "Ngày bắt đầu không hợp lệ",
  }),

  endDate: Joi.date().greater(Joi.ref("startDate")).required().messages({
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
  voucherType: Joi.string().valid("product", "shipping").optional().messages({
    "any.only": "Loại voucher chỉ có thể là 'product' hoặc 'shipping'",
  }),

  code: Joi.string().optional().messages({
    "string.base": "Mã giảm giá phải là chuỗi",
  }),

  userIds: Joi.array().items(Joi.string()).max(10000).optional().messages({
    "array.unique": "Danh sách user không được chứa trùng lặp",
    "array.max": "Danh sách userIds không được vượt quá 10.000",
  }),

  description: Joi.string().optional().messages({
    "string.base": "Mô tả giảm giá phải là chuỗi",
  }),

  discountType: Joi.string().valid("fixed", "percent").optional().messages({
    "any.only": "Chỉ chấp nhận 'fixed' hoặc 'percent'",
  }),

  discountValue: Joi.number()
    .min(0)
    .optional()
    .when("discountType", {
      is: "fixed",
      then: Joi.number().max(10000000),
      otherwise: Joi.number().max(100),
    })
    .messages({
      "number.base": "Giá trị giảm phải là số",
      "number.max": "Giá trị giảm vượt quá giới hạn cho phép",
    }),

  minOrderValues: Joi.number()
    .max(100000000)
    .optional()
    .when("voucherType", {
      is: "shipping",
      then: Joi.number().min(0).messages({
        "number.min": "Giá trị đơn hàng tối thiểu cho shipping phải >= 0",
        "number.max":
          "Giá trị đơn hàng tối thiểu không được vượt quá 100.000.000",
        "number.base": "Giá trị đơn hàng tối thiểu phải là số",
      }),
      otherwise: Joi.number().min(1).messages({
        "number.min": "Giá trị đơn hàng tối thiểu phải ít nhất là 1",
        "number.max":
          "Giá trị đơn hàng tối thiểu không được vượt quá 100.000.000",
        "number.base": "Giá trị đơn hàng tối thiểu phải là số",
      }),
    }),

  minOrderValues: Joi.number().min(0).max(100000000).optional().messages({
    "number.base": "Giá trị đơn hàng tối thiểu phải là số",
    "number.max": "Giá trị đơn hàng tối thiểu không được vượt quá 100.000.000",
  }),

  maxDiscount: Joi.when("discountType", {
    is: "percent",
    then: Joi.number().min(1).max(10000000).optional().messages({
      "number.min": "Số tiền giảm tối đa phải lớn hơn hoặc bằng 1",
      "number.max": "Số tiền giảm tối đa không được vượt quá 10.000.000",
    }),
    otherwise: Joi.forbidden(),
  }),

  quantity: Joi.number().min(1).max(100000).optional().messages({
    "number.min": "Số lượng phải ít nhất là 1",
    "number.max": "Số lượng voucher không được vượt quá 100.000",
  }),

  used: Joi.number().min(0).optional(),

  startDate: Joi.date().optional().messages({
    "date.base": "Ngày bắt đầu không hợp lệ",
  }),

  endDate: Joi.date().greater(Joi.ref("startDate")).optional().messages({
    "date.greater": "Ngày kết thúc phải sau ngày bắt đầu",
  }),

  voucherStatus: Joi.string()
    .valid("active", "inactive", "expired")
    .optional()
    .messages({
      "any.only": "Trạng thái chỉ có thể là: active, inactive hoặc expired",
    }),
});

export { createVoucherSchema, updateVoucherSchema };
