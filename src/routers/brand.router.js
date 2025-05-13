import { Router } from "express";
import {createBrand} from "../controllers/brand.controller";

const router = Router();

router.post("/create", createBrand);
router.get("/get-all", getAllBrands);

export default router;