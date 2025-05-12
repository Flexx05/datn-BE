import { Router } from "express";
import {createBrand} from "../controllers/brand.controller";

const router = Router();

router.post("/create", createBrand);

export default router;