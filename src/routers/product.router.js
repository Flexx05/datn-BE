import { Router } from "express";
import {
  createProductWithVariations,
  deleteProduct,
  generateVariations,
  getAllProduct,
  getProductById,
  getProductBySlug,
  updateProduct,
  updateProductStatus,
  updateVariaionStatus,
} from "../controllers/product.controller";
import { isAdmin, isAdminOrStaff, verifyToken } from "../middlewares/checkAuth";

const router = Router();

router.get("/product", getAllProduct);
router.get("/product/id/:id", getProductById);
router.get("/product/slug/:slug", getProductBySlug);
router.delete("/product/delete/:id", verifyToken, isAdmin, deleteProduct);
router.patch(
  "/product/edit/status/:id",
  verifyToken,
  isAdmin,
  updateProductStatus
);
router.patch("/variation/edit/:id", verifyToken, isAdmin, updateVariaionStatus);
router.post(
  "/product/generate-variations",
  verifyToken,
  isAdmin,
  generateVariations
);
router.post("/product/add", verifyToken, isAdmin, createProductWithVariations);
router.patch("/product/edit/:id", verifyToken, isAdminOrStaff, updateProduct);

export default router;
