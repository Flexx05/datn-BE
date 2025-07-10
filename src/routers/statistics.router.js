import { Router } from "express";
import { getTopProducts } from "../controllers/statistics.controller.js";

const router = Router();

router.get("/statistics/top-products", getTopProducts);

export default router;
