import { Router } from "express";
import {
  createBrand,
  deleteBrand,
  getAllBrands,
  getBrandById,
  showBrand,
  updateBrand,
} from "../controllers/brand.controller";
import { isAdmin, verifyToken } from "../middlewares/checkAuth";

const router = Router();

router.post("/brand/add", verifyToken, isAdmin, createBrand);
router.get("/brand", getAllBrands);
router.get("/brand/id/:id", getBrandById);
router.patch("/brand/edit/:id", verifyToken, isAdmin, updateBrand);
router.get("/brand/show/:slug", showBrand);
router.delete("/brand/delete/:id", verifyToken, isAdmin, deleteBrand);

export default router;
