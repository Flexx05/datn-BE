import Joi from "joi";

const createBrandSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  logoUrl: Joi.string(),
});


const updateBrandSchema = Joi.object({
  name: Joi.string().min(3).max(30),
  logoUrl: Joi.string(),
  isActive: Joi.boolean(),
});

export { createBrandSchema, updateBrandSchema };