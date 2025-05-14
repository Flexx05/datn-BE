import mongoose from "mongoose";
import attributeModel from "../models/attribute.model";
import productModel from "../models/product.model";
import { productSchema } from "../validations/product.validation";
import { generateSlug } from "../utils/createSlug";

export const getAllProduct = async (req, res) => {
  try {
    const { _page = 1, _limit = 10, _sort = "createdAt", _order } = req.query;
    const options = {
      page: parseInt(_page),
      limit: parseInt(_limit),
      sort: { [_sort]: _order === "desc" ? -1 : 1 },
    };
    const product = await productModel.paginate({}, options);
    return res.status(200).json(product);
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productModel.findById(id);
    if (!product)
      return res.status(404).json({ message: "Sản phẩm khôn tồn tại" });
    return res.status(200).json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await productModel.findOne({ slug });
    if (!product)
      return res.status(404).json({ message: "Sản phẩm khôn tồn tại" });
    return res.status(200).json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!product)
      return res.status(404).json({ message: "Sản phẩm khôn tồn tại" });
    return res.status(200).json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// Hàm sinh tổ hợp tổ hợp thuộc tính
function generateCombinations(arr) {
  if (arr.length === 0) return [[]];
  const [first, ...rest] = arr;
  const restComb = generateCombinations(rest);
  return first.flatMap((val) => restComb.map((comb) => [val, ...comb]));
}

export const generateVariations = async (req, res) => {
  try {
    const { attributes } = req.body;

    if (!attributes || attributes.length === 0) {
      return res.status(400).json({ error: "Thuộc tính là bắt buộc" });
    }

    // Validate ObjectIds
    const attributeIds = attributes.map((attr) => attr.attributeId);
    const invalidIds = attributeIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length > 0) {
      return res
        .status(400)
        .json({ error: `attributeId không hợp lệ: ${invalidIds.join(", ")}` });
    }

    // Lấy tên thuộc tính từ DB
    const dbAttributes = await attributeModel.find({
      _id: { $in: attributeIds },
    });
    const attrIdToName = Object.fromEntries(
      dbAttributes.map((attr) => [attr._id.toString(), attr.name])
    );

    // Mảng các giá trị để sinh tổ hợp
    const valueMatrix = attributes.map((attr) => {
      const attrId = attr.attributeId;
      return attr.values.map((value) => ({
        attributeId: attrId,
        attributeName: attrIdToName[attrId],
        value,
      }));
    });

    // Sinh tổ hợp tất cả biến thể
    const combinations = generateCombinations(valueMatrix);

    // Mapping kết quả
    const variation = combinations.map((combo) => {
      const attributes = combo.map((item) => ({
        attributeId: item.attributeId,
        attributeName: item.attributeName,
        values: [item.value],
      }));

      return {
        _id: new mongoose.Types.ObjectId(),
        attributes,
        regularPrice: 0,
        salePrice: 0,
        stock: 0,
        image: "",
        isActive: false,
      };
    });

    return res.status(200).json({ variation });
  } catch (error) {
    console.error("Lỗi generateVariants:", error);
    return res.status(500).json({ error: "Lỗi server" });
  }
};

export const createProductWithVariations = async (req, res) => {
  try {
    const { error, value } = productSchema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ message: errors });
    }

    const {
      name,
      image,
      brandId,
      brandName,
      categoryId,
      categoryName,
      description,
      attributes,
      variation,
    } = value;

    // 1. Validate attributeId
    const attributeIds = attributes.map((attr) => attr.attributeId);
    const invalidIds = attributeIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length > 0) {
      return res
        .status(400)
        .json({ error: `Invalid attributeId(s): ${invalidIds.join(", ")}` });
    }

    // 2. Lấy tên thuộc tính từ DB
    const dbAttributes = await attributeModel.find({
      _id: { $in: attributeIds },
    });
    const attrIdToName = Object.fromEntries(
      dbAttributes.map((attr) => [attr._id.toString(), attr.name])
    );

    // 3. Build attributes mảng cho sản phẩm
    const productAttributes = attributes.map((attr) => ({
      attributeId: attr.attributeId,
      attributeName: attrIdToName[attr.attributeId],
      values: attr.values,
    }));

    const listProduct = await productModel.find();
    const slug = generateSlug(
      name,
      listProduct?.map((p) => p.slug)
    );

    // 4. Xử lý biến thể: set isActive theo stock
    const updatedVariations = variation.map((v) => ({
      ...v,
      isActive: v.stock > 0,
    }));

    // 5. Nếu tất cả biến thể đều stock = 0 → ẩn sản phẩm chính
    const allOutOfStock = updatedVariations.every((v) => v.stock === 0);

    // 6. Tạo sản phẩm
    const product = new productModel({
      name,
      slug,
      image,
      brandId,
      brandName,
      categoryId,
      categoryName,
      description,
      attributes: productAttributes,
      variation: updatedVariations,
      isActive: !allOutOfStock,
    });

    await product.save();

    return res.status(201).json({
      message: "Tạo sản phẩm có biến thể thành công",
      product,
    });
  } catch (error) {
    console.error("Lỗi khi tạo sản phẩm với biến thể:", error);
    return res.status(500).json({ error: "Lỗi server" });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { error, value } = productSchema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ message: errors });
    }
    const {
      name,
      image,
      brandId,
      brandName,
      categoryId,
      categoryName,
      description,
      attributes,
      variation,
    } = value;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "ID sản phẩm không hợp lệ" });
    }

    // Validate và lấy tên thuộc tính
    const attributeIds = attributes.map((attr) => attr.attributeId);
    const dbAttributes = await attributeModel.find({
      _id: { $in: attributeIds },
    });
    const attrIdToName = Object.fromEntries(
      dbAttributes.map((attr) => [attr._id.toString(), attr.name])
    );

    const productAttributes = attributes.map((attr) => ({
      attributeId: attr.attributeId,
      attributeName: attrIdToName[attr.attributeId],
      values: attr.values,
    }));

    const listProduct = await productModel.find();
    const slug = generateSlug(
      name,
      listProduct?.filter((p) => p._id != productId).map((p) => p.slug)
    );

    // Xử lý biến thể: set isActive theo stock
    const updatedVariations = variation.map((v) => ({
      ...v,
      isActive: v.stock > 0,
    }));

    // Nếu tất cả biến thể đều stock = 0 → ẩn sản phẩm chính
    const allOutOfStock = updatedVariations.every((v) => v.stock === 0);

    // Cập nhật
    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      {
        name,
        slug,
        image,
        brandId,
        brandName,
        categoryId,
        categoryName,
        description,
        attributes: productAttributes,
        variation,
        isActive: !allOutOfStock,
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    }

    return res.status(200).json({
      message: "Cập nhật sản phẩm thành công",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Lỗi cập nhật sản phẩm:", error);
    return res.status(500).json({ error: "Lỗi server" });
  }
};
