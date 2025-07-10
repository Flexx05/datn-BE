import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getAllSubCategory,
  getCategoryById,
  getSubCategoryById,
  searchSubCategory,
  showCategoryId,
  showCategorySlug,
  showSubCategory,
  showSubCategoryId,
  updateCategory,
  updateSubCategory,
} from "../controllers/category.controller";

const router = Router();

router.post("/category/add", createCategory);
router.get("/category", getAllCategories);
router.get("/category/id/:id", getCategoryById);
router.get("/category/show/:slug", showCategorySlug);
router.get("/category/:id", showCategoryId); //show theo id
router.patch("/category/edit/:id", updateCategory);
router.delete("/category/delete/:id", deleteCategory);

export default router;
