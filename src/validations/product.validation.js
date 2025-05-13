import Joi from "joi";

const productAttributeSchema = Joi.object({
  attributeId: Joi.required(),
  attributeName: Joi.string(),
  values: Joi.array().items(Joi.string()).required(),
});

const variationSchema = Joi.object({
  attributes: Joi.array().items(productAttributeSchema).min(1),
  regularPrice: Joi.number().required(),
  salePrice: Joi.number(),
  stock: Joi.number().required(),
  image: Joi.string(),
});

export const productSchema = Joi.object({
  name: Joi.string().required().min(3).trim(),
  description: Joi.string().trim(),
  image: Joi.array().items(Joi.string()),
  // brandId: Joi.string().required(),
  // categoryId: Joi.string().required(),
  attributes: Joi.array().items(productAttributeSchema),
  variation: Joi.array().items(variationSchema),
});
