import { Router } from "express";
import { createCategory, getAllCategories, getCategoryById, showCategoryId, showCategorySlug } from "../controllers/category.controller";


const router = Router(); 

router.post("/create", createCategory);
router.get("/get-all", getAllCategories);
router.get("/get-by-id/:id", getCategoryById);
router.get("/show/:slug", showCategorySlug);
router.get("/show/:id", showCategoryId); //show theo id


export default router;