import categoryModel from "../models/category.model";
import productModel from "../models/product.model";
import { generateSlug } from "../utils/createSlug";
import {
  createCategorySchema,
  createSubCategorySchema,
  updateCategorySchema,
} from "../validations/category.validation";

export const createCategory = async (req, res) => {
  try {
    const { parentId } = req.body;
    const schema = parentId ? createSubCategorySchema : createCategorySchema;

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });

    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ message: errors });
    }
    const { name } = req.body;
    const existingCategory = await categoryModel.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: "Tên danh mục đã tồn tại" });
    }
    const cate = await categoryModel.find();
    const newCategory = await categoryModel.create({
      ...value,
      slug: generateSlug(
        value.name,
        cate.map((category) => category.slug)
      ),
    });
    return res.status(201).json({
      message: parentId
        ? "Sub Category created successfully"
        : "Category created successfully",
      newCategory,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const {
      isActive,
      search,
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
    const options = {
      page: parseInt(_page, 10),
      limit: parseInt(_limit, 10),
      sort: { [_sort]: _order === "desc" ? -1 : 1 },
      populate: {
        path: "subCategories",
        match: { isActive: true },
      },
    };

    const categories = await categoryModel.paginate(query, options);
    if (!categories) {
      return res.status(404).json({ error: "Categories not found" });
    }
    return res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categoryModel.findById(id).populate({
      path: "subCategories",
      match: { isActive: true },
      options: { sort: { categorySort: 1 } },
    });
    if (!category)
      return res.status(404).json({ message: "Danh mục không tồn tại" });
    return res.status(200).json(category);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const showCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await categoryModel.findOne({ slug: slug }).populate({
      path: "subCategories",
      match: { isActive: true },
      options: { sort: { categorySort: 1 } },
    });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    return res
      .status(200)
      .json({ message: "Get category successfully", category });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const showCategoryId = async (req, res) => {
  try {
    const { id } = req.params; // param là :id
    const category = await categoryModel
      .findOne({ _id: id, isActive: true })
      .populate({
        path: "subCategories",
        match: { isActive: true },
        options: { sort: { categorySort: 1 } },
      });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    return res
      .status(200)
      .json({ message: "Get category successfully", category });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateCategorySchema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ message: errors });
    }
    // Cập nhật category với slug mới
    const category = await categoryModel.findByIdAndUpdate(
      id,
      {
        ...value,
        slug: generateSlug(
          value.name,
          (await categoryModel.find()).map((c) => c.slug)
        ),
      },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    return res
      .status(200)
      .json({ message: "Category updated successfully", category });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categoryModel.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    if (category.isActive === false) {
      await categoryModel.findByIdAndDelete(id);
      await categoryModel.deleteMany({ parentId: id });
      return res.status(200).json({ message: "Category deleted successfully" });
    }
    if (category.isActive === true) {
      // Xóa mềm: chuyển isActive = false cho category và các subCategories
      await categoryModel.findByIdAndUpdate(id, { isActive: false });
      await categoryModel.updateMany({ parentId: id }, { isActive: false });
      // Chuyển sản phẩm sang danh mục không xác định
      let unCategorized = await categoryModel.findOne({
        slug: "danh-muc-khong-xac-dinh",
      });
      if (!unCategorized) {
        unCategorized = await categoryModel.create({
          name: "Danh mục không xác định",
          slug: "danh-muc-khong-xac-dinh",
          isActive: true,
          parentId: null,
        });
      }
      const subCategories = await categoryModel.find({ parentId: id });
      const subCategoryIds = subCategories.map((sub) => sub._id);
      const affectedCategoryIds = [category._id, ...subCategoryIds];
      await productModel.updateMany(
        { categoryId: { $in: affectedCategoryIds }, isActive: true },
        { categoryId: unCategorized._id, categoryName: unCategorized.name }
      );
      return res.status(200).json({
        message: "Category soft deleted successfully",
        categoryId: id,
        moveToCategoryId: unCategorized._id,
        deletedSubCategoryCount: subCategories.length,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
