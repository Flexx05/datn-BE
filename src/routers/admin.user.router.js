import express from "express";
import {
  getAllUsers,
  getUserById,
  resetUserPassword,
  updateUserInfo,
  updateUserStatus,
} from "../controllers/admin.user.controller.js";
import { verifyToken } from "../middlewares/checkAuth.js";

const router = express.Router();

router.get("/admin/users", verifyToken, getAllUsers);

router.get("/admin/users/id/:id", verifyToken, getUserById);

router.patch("/admin/users/:id/status", verifyToken, updateUserStatus);

router.patch(
  "/admin/users/:id/update-password",
  verifyToken,
  resetUserPassword
);
router.patch("/admin/users/edit/:id", verifyToken, updateUserInfo);

export default router;
