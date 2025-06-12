import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUserActiveStatus,
  updateUserStatus,
  updateUsserInfo,
} from "../controllers/admin.user.controller.js";
import { verifyToken } from "../middlewares/checkAuth.js";

const router = express.Router();

router.get("/admin/users", getAllUsers);

router.get("/admin/users/id/:id", getUserById);

router.patch("/admin/users/:id/status", updateUserStatus);

router.patch("/admin/users/:id/active-status", updateUserActiveStatus);

router.patch("/admin/users/edit/:id", verifyToken, updateUsserInfo);

export default router;
