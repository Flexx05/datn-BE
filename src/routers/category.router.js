import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getAllSubCategory,
  getCategoryById,
  getSubCategoryById,
  searchCategory,
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
router.get("/category/show/:id", showCategoryId); //show theo id
router.patch("/category/edit/:id", updateCategory);
router.delete("/category/delete/:id", deleteCategory);
router.get("/category/search", searchCategory);

// router subCategories
router.get("/category/get-all-subcategory/:parentId", getAllSubCategory);
router.get("/category/get-subcategory-by-id/:id", getSubCategoryById);
router.get("/category/show-subcategory/:slug", showSubCategory);
router.get("/category/show-subcategory/:id", showSubCategoryId); //show : id
router.patch("/category/update-subcategory/:id", updateSubCategory);
// router.delete("/category/delete-subcategory/:id", deleteSubCategory);
// router.delete("/category/delete-subcategory/:id", deleteCategory2);
// router.get("/category/search-subcategory", searchSubCategory);

export default router;
