import { Router } from "express";
import {
  getProductBySlug,
  getAllProduct,
  getProductById,
} from "../controllers/product.controller";

const router = Router();

router.get("/product", getAllProduct);
router.get("/product/id/:id", getProductById);
router.get("/product/slug/:slug", getProductBySlug);

export default router;
