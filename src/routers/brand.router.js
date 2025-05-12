import { Router } from "express";
import {
  createBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  showBrand,
  searchBrand,
} from "../controllers/brand.controller";

const router = Router();

router.post("/create", createBrand);
router.get("/get-all", getAllBrands);
router.get("/get-by-id/:id", getBrandById);
router.get("/show/:slug", showBrand);
router.put("/update/:id", updateBrand);
router.delete("/delete/:id", deleteBrand);
router.get("/search", searchBrand);
export default router;

