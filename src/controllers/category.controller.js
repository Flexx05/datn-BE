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
  