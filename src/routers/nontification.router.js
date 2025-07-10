import { Router } from "express";
import {
  changeReadingStatus,
  deleteNontification,
  getAllNontification,
} from "../controllers/nontification.controller";

const router = Router();

router.get("/notification", getAllNontification);
router.delete("/notification/:id", deleteNontification);
router.patch("/notification/:id", changeReadingStatus);

export default router;
