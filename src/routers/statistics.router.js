import { Router } from "express";
import { getTopProducts } from "../controllers/statistics.controller.js";
import { isAdmin, verifyToken } from "../middlewares/checkAuth.js";

const router = Router();

router.get("/statistics/top-products", verifyToken, isAdmin, getTopProducts);

export default router;
