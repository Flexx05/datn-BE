import Joi from "joi";

export const quickChatSchema = Joi.object({
  content: Joi.string().trim().max(500).min(3).required(),
  category: Joi.number().min(0).required(),
});
