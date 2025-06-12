import express from "express";
import {
  getAllUsers,
  getUserById,
  resetUserPassword,
  updateUserActiveStatus,
  updateUserStatus,
} from "../controllers/admin.user.controller.js";

const router = express.Router();

router.get("/admin/users", getAllUsers);

router.get("/admin/users/id/:id", getUserById);

router.patch("/admin/users/:id/status", updateUserStatus);

router.patch("/admin/users/:id/active-status", updateUserActiveStatus);

router.patch("/admin/users/:id/reset-password", resetUserPassword);

export default router;
