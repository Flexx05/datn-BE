import { Router } from "express";
import {
  login,
  loginGoogle,
  register,
  verifyOtp,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/loginGoogle", loginGoogle);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
