import { Router } from "express";
import {
  createAttribute,
  deleteAttribute,
  getAllAttribute,
  getAttributeById,
  getAttributeBySlug,
  updateAttribute,
} from "../controllers/attribute.controller";
import { isAdmin, verifyToken } from "../middlewares/checkAuth";

const router = Router();

router.get("/attribute", getAllAttribute);
router.get("/attribute/slug/:slug", getAttributeBySlug);
router.get("/attribute/id/:id", getAttributeById);
router.post("/attribute/add", verifyToken, isAdmin, createAttribute);
router.patch("/attribute/edit/:id", verifyToken, isAdmin, updateAttribute);
router.delete("/attribute/delete/:id", verifyToken, isAdmin, deleteAttribute);

export default router;
