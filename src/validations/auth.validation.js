import Joi from "joi";

const registerSchema = Joi.object({
  fullName: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().min(6).max(6).required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().min(3).max(30).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginGoogleSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().min(6).required(),
  newPassword: Joi.string()
    .min(6)
    .required()
    .invalid(Joi.ref("oldPassword"))
    .messages({
      "any.invalid": "Mật khẩu mới không được giống mật khẩu cũ",
    }),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Xác nhận mật khẩu không khớp",
    }),
});

export {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  loginGoogleSchema,
  changePasswordSchema,
};
