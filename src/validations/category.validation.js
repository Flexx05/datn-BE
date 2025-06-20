import Joi from "joi";

const createCategorySchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  description: Joi.string(),
  categorySort: Joi.number(),
  parentId: Joi.allow(null),
});
const updateCategorySchema = Joi.object({
  name: Joi.string().min(3).max(30),
  slug: Joi.string().min(3).max(30),
  description: Joi.string(),
  categorySort: Joi.number(),
  isActive: Joi.boolean(),
  parentId: Joi.allow(null),
});


export {createCategorySchema, updateCategorySchema};