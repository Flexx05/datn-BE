import categoryModel from "../models/category.model";
import { generateSlug } from "../utils/createSlug";

export const createCategory = async (req, res) => {
  try {

    const { name, slug, description, categorySort } = req.body;
    console.log(req.body);  
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!slug) {
      return res.status(400).json({ error: "Slug is required" });
    }

    const newCategory = await categoryModel.create({
      name,
      slug,
      description,
      categorySort,
    });
    return res.status(201).json({ message: "Category created successfully", newCategory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAllCategories = async (req, res) => {
    try {
      const categories = await categoryModel.find({ parentId: null })
        .populate({
          path: "subCategories",
              match: { isActive: true },
              options: { sort: { categorySort: 1 } },
        })
        .sort({ categorySort: 1 });
      if (!categories) {
        return res.status(404).json({ error: "Categories not found" });
      }
      return res.status(200).json({ message: "Get all categories successfully", categories });
  
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
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      return res.status(200).json({ message: "Get category successfully", category });
    } catch (error) {
      return res.status(500).json({ error: error.message });
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
      const category = await categoryModel.findById(id)
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

  export const updateCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, slug, description, categorySort } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      if (!slug) {
        return res.status(400).json({ error: "Slug is required" });
      }
      const category = await categoryModel.findByIdAndUpdate(id, { name, slug, description, categorySort }, { new: true });
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
      const category = await categoryModel.findById(id)
      .populate({
        path: "subCategories",
        match: { isActive: true },
        options: { sort: { categorySort: 1 } },
      });
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      //xoá mềm
      await categoryModel.updateMany({ parentId: id }, { isActive: false });

      const subCategories = await categoryModel.find({ parentId: id });
      for (const subCategory of subCategories) {
        await categoryModel.updateMany({parentId: subCategory._id}, { isActive: false }, { new: true });
      }
        //xoá tất cả sản phẩm trong danh mục con
        // const allCategoryIds = [
        //     id, ...subCategories.map(sub => sub._id),
        //     // Lấy ID của các danh mục cháu
        //     ...(await categoryModel.find({ 
        //       parentId: { $in: subCategories.map(sub => sub._id) } 
        //     })).map(grandChild => grandChild._id)
        //   ];
          
        //   await productModel.updateMany(
        //     { categoryId: { $in: allCategoryIds } },
        //     { isActive: false }
        //   );
        const deleteAll = await categoryModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!brand) {
            return res.status(404).json({ error: "Category not found" });
          }
          
      return res.status(200).json({ message: "Category deleted successfully", deleteAll });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

//   export const searchCategory = async (req, res) => {
//     try {
//       const { name } = req.query;
//       if (!name) {
//         return res.status(400).json({ error: "Name is required" });
//       }
//       const categories = await categoryModel.find({ name: { $regex: name, $options: "a" } })
//         .populate({ 
//           path: "subCategories",
//           match: { isActive: true },
//           options: { sort: { categorySort: 1 } },
//         });
//       if (!categories) {
//         return res.status(404).json({ error: "Categories not found" });
//       }
//       return res.status(200).json({ message: "Get categories successfully", categories });
//     } catch (error) {
//       return res.status(500).json({ error: error.message });
//     }
//   };


// /create danh mục con 
export const createSubCategory = async (req, res) => {
  try {
    const { parentId } = req.params;
    const { name, slug, description, categorySort} = req.body;
    if (!parentId) {
      return res.status(400).json({ error: "ParentId is required" });
    }
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!slug) {
      return res.status(400).json({ error: "Slug is required" });
    }
    const parentCategory = await categoryModel.findById(parentId);
    if (!parentCategory) {
      return res.status(404).json({ error: "Parent category not found" });
    }

    const newSubCategory = await categoryModel.create({
      name,
      slug,
      description,
      categorySort,
      parentId,
    });
    return res.status(201).json({ message: "Sub Category created successfully", newSubCategory });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

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
      return res.status(200).json({ message: "Get all sub categories successfully", parentCategory, subcategories });
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
      return res.status(200).json({ message: "Get sub category successfully", subCategory });
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
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      if (!slug) {
        return res.status(400).json({ error: "Slug is required" });
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

//   export const searchSubCategory = async (req, res) => {
//     try {
//       const { name } = req.query;
//       if (!name) {
//         return res.status(400).json({ error: "Name is required" });
//       }
//       const categories = await categoryModel.find({ name: { $regex: name, $options: "a" } })
//         .populate({
//           path: "subCategories",
//           match: { isActive: true },
//           options: { sort: { categorySort: 1 } },
//         });
//       if (!categories) {
//         return res.status(404).json({ error: " Sub Categories not found" });
//       }
//       return res.status(200).json({ message: "Get sub categories successfully", categories });
//     } catch (error) {
//       return res.status(500).json({ error: error.message });
//     }
//   };
  