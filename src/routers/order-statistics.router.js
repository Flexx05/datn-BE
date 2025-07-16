import { Router } from "express";
import { getOrderStatistics } from "../controllers/order-statistics.controller";

const router = Router();

router.get("/statistics/order-revenue", getOrderStatistics);

export default router;