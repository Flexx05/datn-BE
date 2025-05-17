import express from "express";
import {
  getAllStaff,
  updateStaffRole,
} from "../controllers/staff.controller.js";
import {
  verifyToken,
  isAdmin
} from "../middlewares/checkAuth.js";

const router = express.Router();

router.get("/", verifyToken, isAdmin, getAllStaff);

router.patch("/:id/role", verifyToken, isAdmin, updateStaffRole);

export default router;
