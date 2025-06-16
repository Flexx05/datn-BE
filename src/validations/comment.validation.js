import Joi from "joi";

// Validation cho thêm bình luận
export const addCommentValidation = Joi.object({
  orderId: Joi.string().required(),
  productId: Joi.string().required(),
  content: Joi.string().max(500).allow("").trim(),
  rating: Joi.number().integer().min(1).max(5).required(),
  images: Joi.array().max(5).items(Joi.string()),
});

// Validation cho trả lời bình luận
export const replyToCommentValidation = Joi.object({
  adminReply: Joi.string().required().max(500).trim(),
});

// Validation cho cập nhật trạng thái bình luận
export const updateCommentStatusValidation = Joi.object({
  status: Joi.string().valid("visible", "hidden").required(),
});

