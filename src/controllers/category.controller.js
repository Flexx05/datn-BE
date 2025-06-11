import categoryModel from "../models/category.model";
import productModel from "../models/product.model";
import { generateSlug } from "../utils/createSlug";
import {
  createCategorySchema,
  createSubCategorySchema,
  updateCategorySchema,
  updateSubCategorySchema,
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
 const { categorySort } = req.body;
        const existingCategorySort = await categoryModel.findOne({ categorySort });
        if (existingCategorySort) {
          return res.status(400).json({ message: "Category Sort đã tồn tại" });
        }
       const maxOrderCategory = await categoryModel.findOne().sort({ categorySort: -1 });
          const nextOrder = maxOrderCategory && typeof maxOrderCategory.categorySort === "number"
      ? maxOrderCategory.categorySort + 1
      : 1;

// const newCategory = new categoryModel({
//   name: req.body.name,
//   parentId: req.body.parentId || null,
//   order: maxOrderCategory ? maxOrderCategory.order + 1 : 1,
// });

     const cate = await categoryModel.find();
    const newCategory = await categoryModel.create({ ...value,

      categorySort: nextOrder,
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
    const { isActive, search } = req.query;
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    if (typeof search === "string" && search.trim() !== "") {
      query.name = { $regex: search, $options: "i" };
    }

    const categories = await categoryModel
      .find(query)
      .populate({
        path: "subCategories",
        options: { sort: { categorySort: 1 } },
      })
      .sort({ categorySort: 1 });
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
    const category = await categoryModel.findById(id)
     .populate({
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
      const category = await categoryModel.findOne({ slug: slug })
        .populate({
          path: "subCategories",
          match: { isActive: true },
          options: { sort: { categorySort: 1 } },
        });
      if (!category) {

        return res.status(404).json({ error: "Category not found" });
      }
      return res.status(200).json({ message: "Get category successfully", category });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

export const showCategoryId = async (req, res) => {
    try {
      const { id } = req.params;             // param là :id
      const category = await categoryModel.findOne({ _id: id , isActive: true })
        .populate({
          path: "subCategories",
          match: { isActive: true },
          options: { sort: { categorySort: 1 } },
        });
      if (!category) {
        return res.status(404).json({ error: "Category not found"});
      }
      return res.status(200).json({ message: "Get category successfully", category });
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

      const cate = await categoryModel.findById(id);  // Sửa lấy category hiện tại
      const parentId = cate.parentId || null; // Lấy parentId của category hiện tại
      const sumCate = await categoryModel.countDocuments({ parentId });
      if (value.categorySort > sumCate || value.categorySort < 1) {
        return res.status(400).json({ message: "Category Sort not valid" });
      }
      if (
        value.categorySort &&
        value.categorySort !== cate.categorySort
      ) {
        const target = await categoryModel.findOne({
          categorySort: value.categorySort,
          parentId: cate.parentId || null,
        });

  

        if (target) {
          await categoryModel.findByIdAndUpdate(target._id, {
            categorySort: cate.categorySort,
          });
        }
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
      return res.status(200).json({ message: "Category updated successfully", category });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const mode = req.query.mode || "full"; // Mặc định xoá cả cha và con

    // 1. Kiểm tra danh mục cha tồn tại
    const category = await categoryModel.findOne({ _id: id, isActive: true });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // 2. Nếu là xoá cả cha hoặc xoá con giữ cha
    if (mode === "full" || mode === "keepParent") {
      // 3. Tạo hoặc lấy danh mục "không xác định"
      const unCategorized = await categoryModel.findOneAndUpdate(
        { slug: "danh-muc-khong-xac-dinh" },
        {
          $setOnInsert: {
            name: "Danh mục không xác định",
            slug: "danh-muc-khong-xac-dinh",
            isActive: true,
            parentId: null,
          },
        },
        { upsert: true, new: true }
      );

      // 4. Tìm tất cả danh mục con trực tiếp
      const subCategories = await categoryModel.find({
        parentId: id,
        isActive: true,
      });

      const subCategoryIds = subCategories.map((sub) => sub._id);
      const affectedCategoryIds = [category._id, ...subCategoryIds];

      // 5. Xoá mềm danh mục con
      await categoryModel.updateMany(
        { _id: { $in: subCategoryIds } },
        { isActive: false }
      );

      // 6. Nếu là "full", xoá mềm luôn cả danh mục cha
      if (mode === "full") {
        await categoryModel.findByIdAndUpdate(id, { isActive: false });

        // 7. Chuyển tất cả sản phẩm của cha và con sang danh mục không xác định
        await productModel.updateMany(
          { categoryId: { $in: affectedCategoryIds }, isActive: true },
          { categoryId: unCategorized._id,
            categoryName: unCategorized.name
           }
        );

        return res.status(200).json({
          message:
            "Đã xoá mềm danh mục cha và con, sản phẩm chuyển sang danh mục không xác định",
          categoryId: id,
          moveToCategoryId: unCategorized._id,
          deletedSubCategoryCount: subCategories.length,
        });
      }

      // 8. Nếu là "keepParent", chỉ xoá con – giữ nguyên cha
      return res.status(200).json({
        message: "Đã xoá mềm danh mục con, giữ nguyên danh mục cha",
        parentCategoryId: id,
        deletedSubCategoryCount: subCategories.length,
      });
    }

    // 9. Trường hợp mode không hợp lệ
    return res.status(400).json({ error: "Invalid mode parameter" });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// SUB CATEGORY
export const getAllSubCategory = async (req, res) => {
  try {
    const { parentId } = req.params;
    const parentCategory = await categoryModel.findById(parentId);
    if (!parentCategory) {
      return res.status(404).json({ error: "Parent category not found" });
    }

    const subcategories = await categoryModel
      .find({ parentId, isActive: true })
      .sort({ categorySort: 1 });

    if (!subcategories) {
      return res.status(404).json({ error: " Sub Categories not found" });
    }
    return res.status(200).json(parentCategory, subcategories);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const subCategory = await categoryModel.findById(id).populate({
      path: "subCategories",
      match: { isActive: true },
      options: { sort: { categorySort: 1 } },
    });
    if (!subCategory) {
      return res.status(404).json({ error: "Category not found" });
    }
    return res.status(200).json(subCategory);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const showSubCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const subCategory = await categoryModel.findOne({ slug: slug }).populate({
      path: "subCategories",
      match: { isActive: true },
      options: { sort: { categorySort: 1 } },
    });
    if (!subCategory) {
      return res.status(404).json({ error: "  Sub Category not found" });
    }
    return res
      .status(200)
      .json({ message: "Get sub category successfully", subCategory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const showSubCategoryId = async (req, res) => {
  try {
    const { id } = req.params;
    const subCategory = await categoryModel.findById(id).populate({
      path: "subCategories",
      match: { isActive: true },
      options: { sort: { categorySort: 1 } },
    });
    if (!subCategory) {
      return res.status(404).json({ error: "  Sub Category not found" });
    }
    return res
      .status(200)
      .json({ message: "Get sub category successfully", subCategory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, categorySort } = req.body;
    const { error, value } = updateSubCategorySchema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ message: errors });
    }
    const subCategory = await categoryModel.findByIdAndUpdate(
      id,
      { name, slug, description, categorySort },
      { new: true }
    );
    if (!subCategory) {
      return res.status(404).json({ error: "Sub Category not found" });
    }
    return res
      .status(200)
      .json({ message: "Sub Category updated successfully", subCategory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const subCategory = await categoryModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!subCategory) {
      return res.status(404).json({ error: "Sub Category not found" });
    }
    return res
      .status(200)
      .json({ message: "Sub Category deleted successfully", subCategory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const searchSubCategory = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    const categories = await categoryModel
      .find({ name: { $regex: name, $options: "i" } })
      .populate({
        path: "subCategories",
        match: { isActive: true },
        options: { sort: { categorySort: 1 } },
      });
    if (!categories) {
      return res.status(404).json({ error: " Sub Categories not found" });
    }
    return res
      .status(200)
      .json({ message: "Get sub categories successfully", categories });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
