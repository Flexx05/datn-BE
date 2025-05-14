import { Router } from "express";
import {
  createAttribute,
  deleteAttribute,
  getAllAttribute,
  getAttributeById,
  getAttributeBySlug,
  searchAttribute,
  updateAttribute,
} from "../controllers/attribute.controller";

const router = Router();

router.get("/attribute", getAllAttribute);
router.get("/attribute/search", searchAttribute);
router.get("/attribute/slug/:slug", getAttributeBySlug);
router.get("/attribute/id/:id", getAttributeById);
router.post("/attribute/add", createAttribute);
router.patch("/attribute/edit/:id", updateAttribute);
router.delete("/attribute/delete/:id", deleteAttribute);

export default router;
