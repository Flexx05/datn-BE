import { Router } from "express";
import {
  login,
  loginGoogle,
  register,
  verifyOtp,
  forgotPassword,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/loginGoogle", loginGoogle);
router.post("/forgot-password", forgotPassword);

export default router;