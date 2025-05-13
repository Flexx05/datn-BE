import { Router } from "express";
import {createBrand, getAllBrands, getBrandById, updateBrand} from "../controllers/brand.controller";

const router = Router();

router.post("/create", createBrand);
router.get("/get-all", getAllBrands);
router.get("/get-by-id/:id", getBrandById);
router.put("/update/:id", updateBrand);


export default router;