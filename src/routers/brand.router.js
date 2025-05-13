import { Router } from "express";
import {createBrand, getAllBrands, getBrandById} from "../controllers/brand.controller";

const router = Router();

router.post("/create", createBrand);
router.get("/get-all", getAllBrands);
router.get("/get-by-id/:id", getBrandById);


export default router;