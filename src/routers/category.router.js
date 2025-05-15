import { Router } from "express";
import { createCategory } from "../controllers/category.controller";


const router = Router(); 

router.post("/create", createCategory);


export default router;