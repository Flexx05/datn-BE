import Joi from "joi";

const registerSchema = Joi.object({
  fullName: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  avatar: Joi.string().allow(null, ""),
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({ "any.only": "confirmPassword does not match" }),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().min(6).max(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email không hợp lệ",
    "any.required": "Email là bắt buộc",
  }),
});

const verifyResetOtpSchema = Joi.object({
  otp: Joi.string().length(6).required().messages({
    "string.length": "Mã OTP phải có đúng 6 ký tự",
    "any.required": "Mã OTP là bắt buộc",
  }),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email không hợp lệ",
    "any.required": "Email là bắt buộc",
  }),
  newPassword: Joi.string().min(6).required().messages({
    "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
    "any.required": "Mật khẩu mới là bắt buộc",
  }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Mật khẩu xác nhận không khớp",
      "any.required": "Mật khẩu xác nhận là bắt buộc",
    }),
});

const updateUserInfoSchema = Joi.object({
  fullName: Joi.string().min(3).max(30).optional(),
  phone: Joi.string().optional().allow(null, "").max(10).min(0),
  address: Joi.string().optional().allow(null, ""),
  avatar: Joi.string().optional().allow(null, ""),
});

export {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  updateUserInfoSchema,
};
