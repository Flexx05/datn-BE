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
import { isAdminOrStaff, verifyToken } from "../middlewares/checkAuth";

const router = Router();

router.get("/product", getAllProduct);
router.get("/product/id/:id", getProductById);
router.get("/product/slug/:slug", getProductBySlug);
router.delete(
  "/product/delete/:id",
  verifyToken,
  isAdminOrStaff,
  deleteProduct
);
router.patch(
  "/product/edit/status/:id",
  verifyToken,
  isAdminOrStaff,
  updateProductStatus
);
router.patch(
  "/variation/edit/:id",
  verifyToken,
  isAdminOrStaff,
  updateVariaionStatus
);
router.post(
  "/product/generate-variations",
  verifyToken,
  isAdminOrStaff,
  generateVariations
);
router.post(
  "/product/add",
  verifyToken,
  isAdminOrStaff,
  createProductWithVariations
);
router.patch("/product/edit/:id", verifyToken, isAdminOrStaff, updateProduct);

export default router;
