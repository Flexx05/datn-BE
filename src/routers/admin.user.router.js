import express from "express";
import {
  getAllUsers,
  getUserById,
} from "../controllers/admin.user.controller.js";

const router = express.Router();

router.get("/admin/users", getAllUsers);

router.get("/admin/users/:id", getUserById);

export default router;
