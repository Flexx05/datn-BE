import Joi from "joi";

export const attributeSchema = Joi.object({
  name: Joi.string().required().min(3).trim(),
  value: Joi.array().items(Joi.string()).required(),
});

export const attributeValueSchema = Joi.object({
  name: Joi.string().required(),
});
