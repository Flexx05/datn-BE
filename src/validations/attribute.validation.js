import Joi from "joi";

export const attributeSchema = Joi.object({
  name: Joi.string().required().min(3).trim(),
  values: Joi.array().items(Joi.string()).required(),
  isColor: Joi.boolean(),
  isActive: Joi.boolean(),
});
