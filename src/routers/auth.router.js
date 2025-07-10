import { Router } from "express";
import {
  login,
  loginGoogle,
  register,
  verifyOtp,
  forgotPassword,
  resetPassword,
  verifyResetOtp,
  refreshToken,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/loginGoogle", loginGoogle);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

export default router;
