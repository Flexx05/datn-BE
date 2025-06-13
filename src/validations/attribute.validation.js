import Joi from "joi";

export const attributeSchema = Joi.object({
  name: Joi.string().required().min(3).trim().max(50),
  values: Joi.array().items(Joi.string().min(3).trim().max(20)).required(),
  isColor: Joi.boolean(),
  isActive: Joi.boolean(),
});
