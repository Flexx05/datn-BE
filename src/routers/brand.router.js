import { Router } from "express";
import {createBrand, deleteBrand, getAllBrands, getBrandById, searchBrand, showBrand, updateBrand} from "../controllers/brand.controller";

const router = Router();

router.post("/create", createBrand);
router.get("/get-all", getAllBrands);
router.get("/get-by-id/:id", getBrandById);
router.put("/update/:id", updateBrand);
router.get("/show/:slug", showBrand);
router.delete("/delete/:id", deleteBrand);
router.get("/search", searchBrand);


export default router;