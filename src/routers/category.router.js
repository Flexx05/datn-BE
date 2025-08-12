import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  showCategorySlug,
  updateCategory,
} from "../controllers/category.controller";
import { isAdmin, verifyToken } from "../middlewares/checkAuth";

const router = Router();

router.post("/category/add", verifyToken, isAdmin, createCategory);
router.get("/category", getAllCategories);
router.get("/category/id/:id", getCategoryById);
router.get("/category/show/:slug", showCategorySlug);
router.patch("/category/edit/:id", verifyToken, isAdmin, updateCategory);
router.delete("/category/delete/:id", verifyToken, isAdmin, deleteCategory);

export default router;
