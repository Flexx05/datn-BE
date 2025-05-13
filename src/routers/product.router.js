import { Router } from "express";
import {
  getProductBySlug,
  getAllProduct,
  getProductById,
  deleteProduct,
  generateVariations,
  createProductWithVariations,
} from "../controllers/product.controller";

const router = Router();

router.get("/product", getAllProduct);
router.get("/product/id/:id", getProductById);
router.get("/product/slug/:slug", getProductBySlug);
router.delete("/product/delete/:id", deleteProduct);
router.post("/product/generate-variations", generateVariations);
router.post("/product/add", createProductWithVariations);

export default router;
