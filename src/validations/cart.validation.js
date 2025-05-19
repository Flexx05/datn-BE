import Joi from "joi";

export const addToCartSchema = Joi.object({
  productId: Joi.string().required().messages({
    "string.empty": "ID sản phẩm không được để trống",
    "any.required": "ID sản phẩm là bắt buộc"
  }),
  variantAttributes: Joi.array()
  .items(
    Joi.object({
      attributeName: Joi.string().required().messages({
        "string.empty": "Tên thuộc tính không được để trống",
        "any.required": "Tên thuộc tính là bắt buộc"
      }),
      value: Joi.string().required().messages({
        "string.empty": "Giá trị thuộc tính không được để trống",
        "any.required": "Giá trị thuộc tính là bắt buộc"
      })
    })
  )
  .length(2) // phải đúng 2 thuộc tính
  .custom((value, err) => {
    const names = value.map((v) => v.attributeName);
    if (!names.includes("Màu sắc") || !names.includes("Kích thước")) {
      return err.message("Phải chọn đầy đủ thuộc tính 'Màu sắc' và 'Kích thước'");
    }
    return value;
  })

  .required()
  .messages({
    "array.base": "variantAttributes phải là một mảng",
    "array.length": "Phải có đúng 2 thuộc tính biến thể (Màu sắc và Kích thước)",
    "any.required": "variantAttributes là bắt buộc"
  }),

  quantity: Joi.number().integer().min(1).required().messages({
    "number.base": "Số lượng phải là một số",
    "number.min": "Số lượng phải lớn hơn hoặc bằng 1",
    "string.empty": "Số lượng không được để trống",
    "any.required": "Số lượng là bắt buộc"
  })
});
