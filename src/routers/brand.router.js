import { Router } from "express";
import {createBrand, deleteBrand, getAllBrands, getBrandById, showBrand, updateBrand} from "../controllers/brand.controller";

const router = Router();

router.post("/create", createBrand);
router.get("/get-all", getAllBrands);
router.get("/get-by-id/:id", getBrandById);
router.put("/update/:id", updateBrand);
router.get("/show/:slug", showBrand);
router.delete("/delete/:id", deleteBrand);


export default router;