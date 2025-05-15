import { Router } from "express";
import { 
    createCategory, 
    createSubCategory, 
    deleteCategory, 
    deleteSubCategory, 
    getAllCategories, 
    getAllSubCategory, 
    getCategoryById, 
    getSubCategoryById, 
    searchCategory, 
    searchSubCategory, 
    showCategory, 
    showSubCategory, 
    updateCategory,
    updateSubCategory,

 } from "../controllers/category.controller";

const router = Router(); 



router.post("/create", createCategory);

export default router;