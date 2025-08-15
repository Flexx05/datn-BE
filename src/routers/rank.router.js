import express from "express";
import { getCustomerRank } from "../controllers/rank.controller.js";


const router = express.Router();

router.get("/rank/:id", getCustomerRank);

export default router;