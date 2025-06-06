import { Router } from "express";
import {
  createProductWithVariations,
  deleteProduct,
  generateVariations,
  getAllProduct,
  getProductById,
  getProductBySlug,
  searchProduct,
  updateProduct,
  updateProductStatus,
  updateVariaionStatus,
} from "../controllers/product.controller";

const router = Router();

router.get("/product", getAllProduct);
router.get("/product/id/:id", getProductById);
router.get("/product/slug/:slug", getProductBySlug);
router.delete("/product/delete/:id", deleteProduct);
router.patch("/product/edit/:id/:variationId", updateVariaionStatus);
router.post("/product/generate-variations", generateVariations);
router.post("/product/add", createProductWithVariations);
router.patch("/product/edit/status/:id", updateProductStatus);
router.patch("/product/edit/:id", updateProduct);
router.get("/product/search", searchProduct);

export default router;
