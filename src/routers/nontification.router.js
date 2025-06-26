import { Router } from "express";
import { getAllNontification } from "../controllers/nontification.controller";

const router = Router();

router.get("/notification", getAllNontification);

export default router;
