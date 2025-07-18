import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  showCategorySlug,
  updateCategory,
} from "../controllers/category.controller";

const router = Router();

router.post("/category/add", createCategory);
router.get("/category", getAllCategories);
router.get("/category/id/:id", getCategoryById);
router.get("/category/show/:slug", showCategorySlug);
router.patch("/category/edit/:id", updateCategory);
router.delete("/category/delete/:id", deleteCategory);

export default router;
