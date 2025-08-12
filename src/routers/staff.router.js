import express from "express";
import {
  getAllStaff,
  getOneStaff,
  updateStaffRole,
} from "../controllers/staff.controller.js";
import { verifyToken, isAdmin } from "../middlewares/checkAuth.js";

const router = express.Router();

router.get("/staffs", verifyToken, isAdmin, getAllStaff);
router.get("/staffs/id/:id", verifyToken, isAdmin, getOneStaff);
router.patch("/staffs/:id/role", verifyToken, isAdmin, updateStaffRole);

export default router;
