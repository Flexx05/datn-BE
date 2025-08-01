import { Router } from "express";
import {
  changeManyReadingStatus,
  changeReadingStatus,
  deleteNontification,
  getAllNontification,
} from "../controllers/nontification.controller";

const router = Router();

router.get("/notification", getAllNontification);
router.patch("/notification/mark-many-read", changeManyReadingStatus);
router.delete("/notification/:id", deleteNontification);
router.patch("/notification/:id", changeReadingStatus);

export default router;
