import { Router } from "express";
import { createCategory, createSubCategory, deleteCategory, getAllCategories, getAllSubCategory, getCategoryById, searchCategory, showCategoryId, showCategorySlug, updateCategory } from "../controllers/category.controller";


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

export default router;