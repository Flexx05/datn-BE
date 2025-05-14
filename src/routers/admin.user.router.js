import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUserStatus,
} from "../controllers/admin.user.controller.js";

const router = express.Router();

router.get("/admin/users", getAllUsers);

router.get("/admin/users/:id", getUserById);

router.patch("/admin/users/:id/status", updateUserStatus);

export default router;
