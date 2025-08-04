import { Router } from "express";
import { getOrderStatistics } from "../controllers/order-statistics.controller";
import { isAdmin, verifyToken } from "../middlewares/checkAuth";

const router = Router();

router.get(
  "/statistics/order-revenue",
  verifyToken,
  isAdmin,
  getOrderStatistics
);

export default router;
