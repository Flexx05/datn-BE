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
});

const createSubCategorySchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  description: Joi.string(),
  categorySort: Joi.number(),
    parentId: Joi.string().required(),
});

const updateSubCategorySchema = Joi.object({
  name: Joi.string().min(3).max(30),
  slug: Joi.string().min(3).max(30),
  description: Joi.string(),
  parentId: Joi.allow(null),
  categorySort: Joi.number(),
  isActive: Joi.boolean(),
});


export {createCategorySchema, updateCategorySchema, createSubCategorySchema, updateSubCategorySchema};