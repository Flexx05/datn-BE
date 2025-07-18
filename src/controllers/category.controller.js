import categoryModel from "../models/category.model";
import productModel from "../models/product.model";
import { generateSlug } from "../utils/createSlug";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validations/category.validation";

export const createCategory = async (req, res) => {
  try {
    const { error, value } = createCategorySchema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });

    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ message: errors });
    }
    const { name, parentId } = value;
    if (parentId === "684b9ab14a1d82d1e454b374") {
      return res.status(400).json({
        message: "Không được tạo danh mục con cho danh mục không xác định",
      });
    }
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
    const query = { parentId: null };
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    if (typeof search === "string" && search.trim() !== "") {
      query.name = { $regex: search, $options: "i" };
    }
    const match = {};
    if (isActive !== undefined) {
      match.isActive = isActive === "true";
    }
    const options = {};
    options.populate = {
      path: "subCategories",
      match,
    };
    if (_limit === "off") {
      // Không phân trang, lấy tất cả
      options.pagination = false;
    } else {
      options.page = parseInt(_page, 10) || 1;
      options.limit = parseInt(_limit, 10) || 10;
      options.sort = { [_sort]: _order === "desc" ? -1 : 1 };
    }

    const categories = await categoryModel.paginate(query, options);

    let docs = [];
    if (options.pagination === false) {
      docs = categories.docs;
    } else {
      docs = categories.docs;
    }

    // Đếm sản phẩm cho từng danh mục
    const productCounts = {};
    await Promise.all(
      docs.map(async (cate) => {
        const count = await productModel.countDocuments({
          categoryId: cate._id,
        });
        productCounts[cate._id.toString()] = count;
      })
    );

    // Tính tổng sản phẩm cho danh mục cha
    const resultDocs = await Promise.all(
      categories.docs.map(async (cate) => {
        const cateObj = cate.toObject();

        // Thêm countProduct cho từng subCategory
        let subCategoriesWithCount = [];
        let total = 0;
        if (
          Array.isArray(cateObj.subCategories) &&
          cateObj.subCategories.length > 0
        ) {
          subCategoriesWithCount = await Promise.all(
            cateObj.subCategories.map(async (subCate) => {
              const count = await productModel.countDocuments({
                categoryId: subCate._id,
              });
              total += count;
              return { ...subCate, countProduct: count };
            })
          );
        }

        // Nếu là danh mục cha
        if (!cateObj.parentId) {
          let countProduct = total;
          if (!subCategoriesWithCount.length) {
            countProduct = await productModel.countDocuments({
              categoryId: cateObj._id,
            });
          }
          return {
            ...cateObj,
            subCategories: subCategoriesWithCount,
            countProduct,
          };
        } else {
          // Danh mục con: số sản phẩm của chính nó
          const count = await productModel.countDocuments({
            categoryId: cateObj._id,
          });
          return {
            ...cateObj,
            countProduct: count,
          };
        }
      })
    );

    if (options.pagination === false) {
      return res.status(200).json(resultDocs);
    } else {
      return res.status(200).json({ ...categories, docs: resultDocs });
    }
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

    const { name, parentId } = value;
    if (parentId === "684b9ab14a1d82d1e454b374") {
      return res.status(400).json({
        message: "Không được tạo danh mục con cho danh mục không xác định",
      });
    }
    const existingCategory = await categoryModel.findOne({
      name,
      _id: { $ne: id },
    });
    if (existingCategory) {
      return res.status(400).json({ message: "Tên danh mục đã tồn tại" });
    }
    // Cập nhật category với slug mới
    const listCate = await categoryModel.find();
    const slug = generateSlug(
      name,
      listCate?.filter((c) => c._id !== id).map((c) => c.slug)
    );
    const category = await categoryModel.findByIdAndUpdate(
      id,
      {
        ...value,
        slug,
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
      if (category.slug === unCategorized.slug)
        return res
          .status(400)
          .json({ message: "Không thể xóa danh mục không xác định" });
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
