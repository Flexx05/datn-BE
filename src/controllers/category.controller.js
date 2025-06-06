import categoryModel from "../models/category.model";
import productModel from "../models/product.model";
import { generateSlug } from "../utils/createSlug";
import { createCategorySchema, createSubCategorySchema, updateCategorySchema, updateSubCategorySchema } from "../validations/category.validation";

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
      ), });
    return res.status(201).json({ message: parentId ? "Sub Category created successfully" : "Category created successfully", newCategory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

};

export const getAllCategories = async (req, res) => {
    try {

      // if(value.parentId){
      //   const parent = await categoryModel.findOne({ _id: value.parentId, isActive: true });
      //   if (!parent) {
      //     return res.status(404).json({ error: "Parent category not found" });
      //   }
      // }
      const categories = await categoryModel.find({ parentId: null })
        .populate({
          path: "subCategories",
              // match: { isActive: true },
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

  // export const getCategoryById = async (req, res) => {
  //   try {
  //     const { id } = req.params;
  //     const category = await categoryModel.findById(id)
  //       .populate({
  //         path: "subCategories",
  //         match: { isActive: true },
  //         options: { sort: { categorySort: 1 } },
  //       });
  //     if (!category) {
  //       return res.status(404).json({ error: "Category not found" });
  //     }
  //     return res.status(200).json(category);
  //   } catch (error) {
  //     return res.status(500).json({ error: error.message });
  //   }
  // };


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
        return res.status(400).json({ message: "Category Sort does not exist" });
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
          slug: generateSlug(value.name, (await categoryModel.find()).map((c) => c.slug)),
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
    const mode = req.query.mode || "full"; // mặc định là full

    // Kiểm tra danh mục cha tồn tại và isActive
    const category = await categoryModel.findOne({ _id: id, isActive: true });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (mode === "full"|| mode === "keepParent") {
      // --- Xoá mềm category cha ---
      await categoryModel.findByIdAndUpdate(id, { isActive: false });

      // --- Tìm tất cả danh mục con trực tiếp ---
      const subCategories = await categoryModel.find({ parentId: id, isActive: true });

      // --- Xoá mềm tất cả danh mục con ---

      for (const subCategory of subCategories) {
        await categoryModel.findByIdAndUpdate(subCategory._id, { isActive: false });


        // --- Xoá mềm sản phẩm liên kết danh mục con ---
        // await productModel.updateMany(
        //   { categoryId: subCategory._id, isActive: true },
        //   { isActive: false }
        // );
      }

      // --- Xoá mềm sản phẩm liên kết danh mục cha ---
      

      return res.status(200).json({
        message: "Deleted category, subcategories and related products (soft delete)",
        categoryId: id,
        deletedSubCategoryCount: subCategories.length,
      });
    } else if (mode === "keepParent") {
      // --- Tìm danh mục con trực tiếp ---
      const subCategories = await categoryModel.find({ parentId: id, isActive: true });

      // --- Xoá mềm tất cả danh mục con --- 
      for (const subCategory of subCategories) {
        await categoryModel.findByIdAndUpdate(subCategory._id, { isActive: false });
  
      }
      // Giữ nguyên danh mục cha (không xoá mềm)
      return res.status(200).json({
        message: "Deleted subcategories and related products, kept parent category",
        parentCategoryId: id,
        deletedSubCategoryCount: subCategories.length,
      });
    } else {
      return res.status(400).json({ error: "Invalid mode parameter" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const searchCategory = async (req, res) => {
  try {
    const { name, page = 1, pageSize = 10 } = req.query;

    const query = {};

    if (typeof name === "string" && name.trim() !== "") {
      query.name = { $regex: name, $options: "i" };
    }

    const categories = await categoryModel
      .find(query)
      .sort({ categorySort: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate({
        path: "subCategories",
        options: { sort: { categorySort: 1 } },
      });
    return res.status(200).json(categories);
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
      
      const subcategories = await categoryModel.find({ parentId, isActive: true }) .sort({ categorySort: 1 });
      
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
      const subCategory = await categoryModel.findById(id)
        .populate({
          path: "subCategories",
          match: { isActive: true },
          options: { sort: { categorySort: 1 } },
        });
      if (!subCategory) {
        return res.status(404).json({ error: "Category not found" });
      }
      return res.status(200).json(subCategory );
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  export const showSubCategory = async (req, res) => {
    try {
      const { slug } = req.params;
      const subCategory = await categoryModel.findOne({ slug: slug })
        .populate({
          path: "subCategories",
          match: { isActive: true },
          options: { sort: { categorySort: 1 } },
        });
      if (!subCategory) {
        return res.status(404).json({ error: "  Sub Category not found" });
      }
      return res.status(200).json({ message: "Get sub category successfully", subCategory });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  export const showSubCategoryId = async (req, res) => {
    try {
      const { id } = req.params;
      const subCategory = await categoryModel.findById(id)
        .populate({
          path: "subCategories",
          match: { isActive: true },
          options: { sort: { categorySort: 1 } },
        });
      if (!subCategory) {
        return res.status(404).json({ error: "  Sub Category not found" });
      }
      return res.status(200).json({ message: "Get sub category successfully", subCategory });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  export const updateSubCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, slug, description, categorySort} = req.body;
      const { error, value } = updateSubCategorySchema.validate(req.body, {
           abortEarly: false,
           convert: false,
         });
         if (error) {
           const errors = error.details.map((err) => err.message);
           return res.status(400).json({ message: errors });
         }
      const subCategory = await categoryModel.findByIdAndUpdate(id, { name, slug, description, categorySort }, { new: true });
      if (!subCategory) {
        return res.status(404).json({ error: "Sub Category not found" });
      }
      return res.status(200).json({ message: "Sub Category updated successfully", subCategory });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  export const deleteSubCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const subCategory = await categoryModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
      if (!subCategory) {
        return res.status(404).json({ error: "Sub Category not found" });
      } 
      return res.status(200).json({ message: "Sub Category deleted successfully", subCategory });
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
      const categories = await categoryModel.find({ name: { $regex: name, $options: "i" } })
        .populate({
          path: "subCategories",
          match: { isActive: true },
          options: { sort: { categorySort: 1 } },
        });
      if (!categories) {
        return res.status(404).json({ error: " Sub Categories not found" });
      }
      return res.status(200).json({ message: "Get sub categories successfully", categories });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
  