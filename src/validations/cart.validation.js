import Joi from "joi";

export const addToCartSchema = Joi.object({
  productId: Joi.string().required().messages({
    "string.empty": "ID sản phẩm không được để trống",
    "any.required": "ID sản phẩm là bắt buộc"
  }),
  variantId: Joi.string().required().messages({
    "string.empty": "ID biến thể không được để trống",
    "any.required": "ID biến thể là bắt buộc",
  }),

  quantity: Joi.number().integer().min(0).required().messages({
    "number.base": "Số lượng phải là một số",
    "number.min": "Số lượng phải lớn hơn hoặc bằng 1",
    "string.empty": "Số lượng không được để trống",
    "any.required": "Số lượng là bắt buộc"
  })
});