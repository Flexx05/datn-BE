import mongoose from "mongoose";
import attributeModel from "../models/attribute.model";
import productModel from "../models/product.model";
import { productSchema } from "../validations/product.validation";
import { generateSlug } from "../utils/createSlug";
import brandModel from "../models/brand.model";
import categoryModel from "../models/category.model";

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

    // Tìm sản phẩm
    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }

    // Cập nhật trạng thái isActive của sản phẩm
    product.isActive = false;

    // Nếu có biến thể, cập nhật isActive từng biến thể
    if (product.variation && product.variation.length > 0) {
      product.variation.forEach((v) => {
        v.isActive = false;
      });
    }

    // Lưu lại sản phẩm
    await product.save();

    return res.status(200).json({
      message: "Đã ẩn sản phẩm và các biến thể thành công",
      product,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// Hàm sinh tổ hợp tổ hợp thuộc tính
function generateCombinations(matrix) {
  if (!matrix.length) return [];
  return matrix.reduce(
    (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
    [[]]
  );
}

export const generateVariations = async (req, res) => {
  try {
    const { attributes } = req.body;
    if (!attributes?.length) {
      return res.status(400).json({ error: "Thuộc tính là bắt buộc" });
    }

    /* ==== 1. KHÔNG cho trùng attributeId ==== */
    const attrIds = attributes.map((a) => a.attributeId);
    const dupAttrIds = attrIds.filter((id, i) => attrIds.indexOf(id) !== i);
    if (dupAttrIds.length) {
      return res.status(400).json({
        error: `Thuộc tính bị lặp: ${[...new Set(dupAttrIds)].join(", ")}`,
      });
    }

    /* ==== 2. Check ObjectId hợp lệ ==== */
    const invalidIds = attrIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length) {
      return res
        .status(400)
        .json({ error: `attributeId không hợp lệ: ${invalidIds.join(", ")}` });
    }

    /* ==== 3. Không cho trùng VALUE trong cùng 1 thuộc tính ==== */
    const dupValueAttrs = attributes.filter((a) => {
      const lower = a.values.map((v) => v.toLowerCase());
      return new Set(lower).size !== lower.length;
    });
    if (dupValueAttrs.length) {
      const msg = dupValueAttrs
        .map((a) => `Thuộc tính ${a.attributeId} có giá trị trùng lặp`)
        .join("; ");
      return res.status(400).json({ error: msg });
    }

    /* ==== 4. Lấy tên thuộc tính ==== */
    const dbAttrs = await attributeModel.find({ _id: { $in: attrIds } });
    const id2name = Object.fromEntries(
      dbAttrs.map((d) => [d._id.toString(), d.name])
    );

    /* ==== 5. Chuẩn bị ma trận giá trị ==== */
    const valueMatrix = attributes.map((a) =>
      a.values.map((v) => ({
        attributeId: a.attributeId,
        attributeName: id2name[a.attributeId],
        value: v,
      }))
    );

    /* ==== 6. Sinh tổ hợp ==== */
    const combos = generateCombinations(valueMatrix);

    /* ==== 7. Mapping về variation ==== */
    const variation = combos.map((combo) => ({
      _id: new mongoose.Types.ObjectId(),
      attributes: combo.map((i) => ({
        attributeId: i.attributeId,
        attributeName: i.attributeName,
        values: [i.value],
      })),
      regularPrice: 0,
      salePrice: 0,
      stock: 0,
      image: "",
      isActive: false, // mặc định vì stock = 0
    }));

    return res.status(200).json({ variation });
  } catch (err) {
    console.error("generateVariations:", err);
    return res.status(500).json({ error: "Lỗi server" });
  }
};

export const createProductWithVariations = async (req, res) => {
  try {
    const { error, value } = productSchema.validate(req.body, {
      abortEarly: false,
      // convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ message: errors });
    }
    let brandName = "";
    let categoryName = "";

    const {
      name,
      image,
      brandId,
      categoryId,
      description,
      attributes,
      variation,
    } = value;

    if (!Array.isArray(attributes)) {
      return res
        .status(400)
        .json({ error: "Trường attributes không tồn tại hoặc không hợp lệ" });
    }

    if (brandId) {
      // Kiểm tra brandId hợp lệ và tồn tại
      if (!mongoose.Types.ObjectId.isValid(brandId))
        return res.status(400).json({ error: "brandId không hợp lệ" });

      const brand = await brandModel.findById(brandId);
      if (brand.isActive === false)
        return res.status(404).json({ error: "Thương hiệu không tồn tại" });

      brandName = brand.name; // đồng bộ tên
    }

    if (categoryId) {
      // Kiểm tra categoryId hợp lệ và tồn tại
      if (!mongoose.Types.ObjectId.isValid(categoryId))
        return res.status(400).json({ error: "categoryId không hợp lệ" });

      const category = await categoryModel.findById(categoryId);
      if (category.isActive === false)
        return res.status(404).json({ error: "Danh mục không tồn tại" });

      categoryName = category.name; // đồng bộ tên
    }

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
      isColor: attr.isColor,
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

    if (brandId) {
      // Kiểm tra brandId hợp lệ và tồn tại
      if (!mongoose.Types.ObjectId.isValid(brandId))
        return res.status(400).json({ error: "brandId không hợp lệ" });

      const brand = await brandModel.findById(brandId);
      if (brand.isActive === false)
        return res.status(404).json({ error: "Thương hiệu không tồn tại" });

      brandName = brand.name; // đồng bộ tên
    }

    if (categoryId) {
      // Kiểm tra categoryId hợp lệ và tồn tại
      if (!mongoose.Types.ObjectId.isValid(categoryId))
        return res.status(400).json({ error: "categoryId không hợp lệ" });

      const category = await categoryModel.findById(categoryId);
      if (category.isActive === false)
        return res.status(404).json({ error: "Danh mục không tồn tại" });

      categoryName = category.name; // đồng bộ tên
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

export const searchProduct = async (req, res) => {
  try {
    const query = {};
    for (const key in req.query) {
      if (key.endsWith("_like")) {
        const field = key.replace("_like", "");
        const value = req.query[key];
        query[field] = { $regex: value, $options: "i" };
      }
    }
    const products = await productModel.find(query);
    return res.status(200).json(products);
  } catch (error) {
    console.error("Lỗi tìm kiếm sản phẩm:", error);
    return res.status(500).json({ error: "Lỗi server" });
  }
};

export const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body; // Trạng thái mới muốn set

    // Tìm sản phẩm
    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }
    const variation = product.variation;
    console.log("variation", variation);
    if (variation?.map((v) => v.stock === 0) && product.isActive === false)
      return res.status(400).json({ message: "Sản phẩm đã hết hàng" });

    // Cập nhật trạng thái sản phẩm
    product.isActive = isActive;

    // Cập nhật trạng thái cho tất cả biến thể
    if (product.variation && product.variation.length > 0) {
      product.variation.forEach((v) => {
        v.isActive = isActive;
      });
    }

    // Lưu lại sản phẩm
    await product.save();

    return res.status(200).json({ message: "Cập nhật trạng thái thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái sản phẩm:", error);
    return res.status(500).json({ error: "Lỗi server" });
  }
};

export const updateVariaionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { variationId } = req.params;
    const product = await productModel.findById(id);
    if (!product)
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    const variation = product.variation.find((v) => v._id == variationId);
    if (!variation)
      return res.status(404).json({ message: "Biến thể không tìm thấy" });
    if (variation.stock == 0 && variation.isActive === false)
      return res.status(400).json({ message: "Sản phẩm này đã hết hàng" });
    variation.isActive = !variation.isActive;
    await product.save();
    return res.status(200).json(variation);
  } catch (error) {
    console.error("Lỗi xóa biến thể:", error);
    return res.status(500).json({ error: "Lỗi server" });
  }
};
