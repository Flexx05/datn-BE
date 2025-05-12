import { Router } from "express";
import {
  loginGoogle,
  register,
  verifyOtp,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);


export default router;