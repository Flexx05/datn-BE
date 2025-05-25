import Joi from "joi";

const registerSchema = Joi.object({
  fullName: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({ "any.only": "confirmPassword does not match" }),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().min(6).max(6).required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({ "any.only": "confirmPassword does not match" }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginGoogleSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});


const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email không hợp lệ",
    "any.required": "Email là bắt buộc"
  })
});


export { 
  registerSchema, 
  verifyOtpSchema, 
  loginSchema, 
  loginGoogleSchema,
  forgotPasswordSchema,
};

