import { Router } from "express";
import {
  changeManyReadingStatus,
  changeReadingStatus,
  deleteNontification,
  getAllNontification,
} from "../controllers/nontification.controller";
import { isAdminOrStaff, verifyToken } from "../middlewares/checkAuth";

const router = Router();

router.get("/notification", verifyToken, isAdminOrStaff, getAllNontification);
router.patch(
  "/notification/mark-many-read",
  verifyToken,
  isAdminOrStaff,
  changeManyReadingStatus
);
router.delete(
  "/notification/:id",
  verifyToken,
  isAdminOrStaff,
  deleteNontification
);
router.patch(
  "/notification/:id",
  verifyToken,
  isAdminOrStaff,
  changeReadingStatus
);

export default router;
