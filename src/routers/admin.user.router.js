import express from "express";
import { getAllUsers } from "../controllers/admin.user.controller.js";

const router = express.Router();

router.get("/admin/users", getAllUsers);

export default router;
