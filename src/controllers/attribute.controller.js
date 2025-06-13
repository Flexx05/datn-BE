import attributeModel from "../models/attribute.model";
import { generateSlug } from "../utils/createSlug";
import { attributeSchema } from "../validations/attribute.validation";

export const getAllAttribute = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    if (typeof search === "string" && search.trim() !== "") {
      query.name = { $regex: search, $options: "i" };
    }
    const attributes = await attributeModel.find(query);
    return res.status(200).json(attributes);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const getAttributeBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const attribute = await attributeModel.findOne({ slug });
    if (!attribute)
      return res.status(404).json({ message: "Thuộc tính không tồn tại" });
    return res.status(200).json(attribute);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const getAttributeById = async (req, res) => {
  try {
    const { id } = req.params;
    const attribute = await attributeModel.findById(id);
    if (!attribute)
      return res.status(404).json({ message: "Thuộc tinh không tồn tại" });
    return res.status(200).json(attribute);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const deleteAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const attribute = await attributeModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!attribute)
      return res.status(404).json({ message: "Thuộc tinh không tồn tại" });
    return res.status(200).json(attribute);
  } catch (error) {
    return res.status(400).json({ message: error.message });
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
      return res.status(400).json({ message: errors });
    }

    // Kiểm tra trùng tên thuộc tính (không phân biệt hoa thường, loại bỏ khoảng trắng)
    const normalizedName = value.name.trim().toLowerCase();
    const attributes = await attributeModel.find();
    const hasNameDuplicate = attributes.some(
      (attr) => attr.name && attr.name.trim().toLowerCase() === normalizedName
    );
    if (hasNameDuplicate) {
      return res.status(400).json({ message: "Tên thuộc tính đã tồn tại." });
    }

    // Kiểm tra trùng tên value (không phân biệt hoa thường, loại bỏ khoảng trắng)
    const normalized = value.values.map((v) => v.trim().toLowerCase());
    const hasDuplicate = normalized.some((v, i) => normalized.indexOf(v) !== i);
    if (hasDuplicate) {
      return res
        .status(400)
        .json({ message: "Các giá trị value không được trùng tên." });
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
    return res.status(400).json({ message: error.message });
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
      return res.status(400).json({ message: errors });
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
      return res.status(400).json({ message: "Tên thuộc tính đã tồn tại." });
    }

    // Kiểm tra trùng tên value (không phân biệt hoa thường, loại bỏ khoảng trắng)
    const normalized = value.values.map((v) => v.trim().toLowerCase());
    const hasDuplicate = normalized.some((v, i) => normalized.indexOf(v) !== i);
    if (hasDuplicate) {
      return res
        .status(400)
        .json({ message: "Các giá trị value không được trùng tên." });
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
      return res.status(404).json({ message: "Thuộc tinh không tồn tại" });
    return res.status(200).json(attribute);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
