import attributeModel from "../models/attribute.model";
import productModel from "../models/product.model";
import { generateSlug } from "../utils/createSlug";
import { attributeSchema } from "../validations/attribute.validation";

export const getAllAttribute = async (req, res) => {
  try {
    const {
      search,
      isActive,
      _page = 1,
      _limit = 10,
      _sort = "createdAt",
      _order,
    } = req.query;
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    if (typeof search === "string" && search.trim() !== "") {
      query.name = { $regex: search, $options: "i" };
    }
    const options = {};
    if (_limit === "off") {
      // Không phân trang, lấy tất cả
      options.pagination = false;
    } else {
      options.page = parseInt(_page, 10) || 1;
      options.limit = parseInt(_limit, 10) || 10;
      options.sort = { [_sort]: _order === "desc" ? -1 : 1 };
    }

    const attributes = await attributeModel.paginate(query, options);

    let docs = [];
    if (options.paginate === false) {
      docs = attributes.docs;
    } else {
      docs = attributes.docs;
    }
    // Thêm countProduct vào từng attribute
    const countProduct = await Promise.all(
      attributes.docs.map(async (attr) => {
        const count = await productModel.countDocuments({
          attributes: { $elemMatch: { attributeId: attr._id } },
        });
        return { ...attr.toObject(), countProduct: count };
      })
    );
    if (_limit === "off") {
      return res.status(200).json(countProduct);
    } else {
      return res.status(200).json({ ...attributes, docs: countProduct });
    }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const getAttributeBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const attribute = await attributeModel.findOne({ slug });
    if (!attribute)
      return res.status(404).json({ error: "Thuộc tính không tồn tại" });
    return res.status(200).json(attribute);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const getAttributeById = async (req, res) => {
  try {
    const { id } = req.params;
    const attribute = await attributeModel.findById(id);
    if (!attribute)
      return res.status(404).json({ error: "Thuộc tinh không tồn tại" });
    return res.status(200).json(attribute);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const deleteAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const getOneAttribute = await attributeModel.findById(id);
    if (getOneAttribute.isActive === true) {
      const productExist = await productModel.findOne({
        attributes: { $elemMatch: { attributeId: id } },
      });
      if (productExist) {
        return res
          .status(400)
          .json({ error: "Thuộc tính đang tồn tại sản phẩm" });
      }
      const attribute = await attributeModel.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );
      if (!attribute)
        return res.status(404).json({ error: "Thuộc tinh không tồn tại" });
      return res.status(200).json(attribute);
    }
    const attribute = await attributeModel.findByIdAndDelete(id);
    if (!attribute)
      return res.status(404).json({ error: "Thuộc tinh không tồn tại" });
    return res
      .status(200)
      .json({ error: "Thuộc tính đã được xóa thành công", attribute });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const createAttribute = async (req, res) => {
  try {
    const { error, value } = attributeSchema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ error: errors });
    }

    // Kiểm tra trùng tên thuộc tính (không phân biệt hoa thường, loại bỏ khoảng trắng)
    const normalizedName = value.name.trim().toLowerCase();
    const attributes = await attributeModel.find();
    const hasNameDuplicate = attributes.some(
      (attr) => attr.name && attr.name.trim().toLowerCase() === normalizedName
    );
    if (hasNameDuplicate) {
      return res.status(400).json({ error: "Tên thuộc tính đã tồn tại." });
    }

    // Kiểm tra trùng tên value (không phân biệt hoa thường, loại bỏ khoảng trắng)
    const normalized = value.values.map((v) => v.trim().toLowerCase());
    const hasDuplicate = normalized.some((v, i) => normalized.indexOf(v) !== i);
    if (hasDuplicate) {
      return res
        .status(400)
        .json({ error: "Các giá trị value không được trùng tên." });
    }

    const values = value.values.map((val) => val);
    const attribute = await attributeModel.create({
      ...value,
      slug: generateSlug(
        value.name,
        attributes.map((attr) => attr.slug)
      ),
      values,
    });
    return res.status(200).json(attribute);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const updateAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = attributeSchema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ error: errors });
    }

    // Kiểm tra trùng tên thuộc tính (không phân biệt hoa thường, loại bỏ khoảng trắng, loại trừ chính nó)
    const normalizedName = value.name.trim().toLowerCase();
    const attributes = await attributeModel.find();
    const hasNameDuplicate = attributes.some(
      (attr) =>
        attr._id != id &&
        attr.name &&
        attr.name.trim().toLowerCase() === normalizedName
    );
    if (hasNameDuplicate) {
      return res.status(400).json({ error: "Tên thuộc tính đã tồn tại." });
    }

    // Kiểm tra trùng tên value (không phân biệt hoa thường, loại bỏ khoảng trắng)
    const normalized = value.values.map((v) => v.trim().toLowerCase());
    const hasDuplicate = normalized.some((v, i) => normalized.indexOf(v) !== i);
    if (hasDuplicate) {
      return res
        .status(400)
        .json({ error: "Các giá trị value không được trùng tên." });
    }

    const values = value.values.map((val) => val);
    const attribute = await attributeModel.findByIdAndUpdate(
      id,
      {
        ...value,
        slug: generateSlug(
          value.name,
          attributes.filter((attr) => attr._id != id).map((attr) => attr.slug)
        ),
        values,
      },
      {
        new: true,
      }
    );
    if (!attribute)
      return res.status(404).json({ error: "Thuộc tinh không tồn tại" });
    return res.status(200).json(attribute);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
