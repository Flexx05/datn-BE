import Joi from "joi";

export const attributeUpdateSchema = Joi.object({
  name: Joi.string().required().min(3).trim(),
  values: Joi.array().items(Joi.string()).required(),
  isColor: Joi.boolean(),
  isActive: Joi.boolean(),
});

export const attributeCreateSchema = Joi.object({
  name: Joi.string().required().min(3).trim(),
  isColor: Joi.boolean(),
  values: Joi.array().items(Joi.string()).required(),
  isActive: Joi.boolean(),
});
