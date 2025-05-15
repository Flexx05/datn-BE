import { Router } from "express";
import { createCategory } from "../controllers/category.controller";


const router = Router(); 

router.post("/create", createCategory);
router.get("/get-all", getAllCategories);


export default router;