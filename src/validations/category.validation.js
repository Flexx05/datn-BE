import Joi from "joi";

const createCategorySchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  description: Joi.string(),
  categorySort: Joi.number(),

});
const updateCategorySchema = Joi.object({
  name: Joi.string().min(3).max(30),
  slug: Joi.string().min(3).max(30),
  description: Joi.string(),
  parentId: Joi.required(),
  categorySort: Joi.number(),
  isActive: Joi.boolean(),
});

const createSubCategorySchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  description: Joi.string(),
  categorySort: Joi.number(),
});

const updateSubCategorySchema = Joi.object({
  name: Joi.string().min(3).max(30),
  slug: Joi.string().min(3).max(30),
  description: Joi.string(),
  parentId: Joi.required(),
  categorySort: Joi.number(),
  isActive: Joi.boolean(),

});


export {createCategorySchema, updateCategorySchema, createSubCategorySchema, updateSubCategorySchema};