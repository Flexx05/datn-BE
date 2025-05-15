import { Router } from "express";
import { createCategory, createSubCategory, deleteCategory, deleteSubCategory, getAllCategories, getAllSubCategory, getCategoryById, getSubCategoryById, searchCategory, showCategoryId, showCategorySlug, showSubCategory, showSubCategoryId, updateCategory, updateSubCategory } from "../controllers/category.controller";


const router = Router(); 

router.post("/create", createCategory);
router.get("/get-all", getAllCategories);
router.get("/get-by-id/:id", getCategoryById);
router.get("/show/:slug", showCategorySlug);
router.get("/show/:id", showCategoryId); //show theo id
router.put("/update/:id",updateCategory)
router.delete("/delete/:id", deleteCategory);
// router.get("/search",searchCategory);


// router subCategories
router.post("/create-subcategory/:parentId",createSubCategory );
router.get("/get-all-subcategory/:parentId", getAllSubCategory);
router.get("/get-subcategory-by-id/:id", getSubCategoryById);
router.get("/show-subcategory/:slug", showSubCategory);
router.get("/show-subcategory/:id", showSubCategoryId); //show : id
router.put("/update-subcategory/:id", updateSubCategory);
router.delete("/delete-subcategory/:id", deleteSubCategory);

export default router;