import { Router } from "express";
import {
  getProductBySlug,
  getAllProduct,
  getProductById,
  deleteProduct,
} from "../controllers/product.controller";

const router = Router();

router.get("/product", getAllProduct);
router.get("/product/id/:id", getProductById);
router.get("/product/slug/:slug", getProductBySlug);
router.delete("/product/delete/:id", deleteProduct);

export default router;
