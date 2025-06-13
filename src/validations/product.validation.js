import Joi from "joi";

const productAttributeSchema = Joi.object({
  attributeId: Joi.string().required(),
  attributeName: Joi.string(),
  isColor: Joi.boolean(),
  values: Joi.array().items(Joi.string()).required(),
  createdAt: Joi.string(),
  updatedAt: Joi.string(),
});

const variationSchema = Joi.object({
  _id: Joi.string(),
  attributes: Joi.array().items(productAttributeSchema).min(1),
  regularPrice: Joi.number().min(1000).max(1000000000).required(),
  salePrice: Joi.number().min(1000).max(1000000000).required(),
  stock: Joi.number().min(0).max(10000).required(),
  image: Joi.string(),
  isActive: Joi.boolean().default(true),
  createdAt: Joi.string(),
  updatedAt: Joi.string(),
});

export const productSchema = Joi.object({
  name: Joi.string().required().min(3).trim().max(100),
  description: Joi.string().trim().allow(null),
  image: Joi.array().items(Joi.string()),
  brandId: Joi.string().required(),
  categoryId: Joi.string().required(),
  attributes: Joi.array().required().items(productAttributeSchema).min(1),
  variation: Joi.array().items(variationSchema),
});
