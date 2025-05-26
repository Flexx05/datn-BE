import { Router } from "express";
import {createBrand, deleteBrand, getAllBrands, getBrandById, searchBrand, showBrand, updateBrand} from "../controllers/brand.controller";

const router = Router();

router.post("/brand/add", createBrand);
router.get("/brand", getAllBrands);
router.get("/brand/id/:id", getBrandById);
router.patch("/brand/edit/:id", updateBrand);
router.get("/brand/show/:slug", showBrand);
router.delete("/brand/delete/:id", deleteBrand);
router.get("/brand/search", searchBrand);


export default router;