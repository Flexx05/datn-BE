import { Router } from "express";
import {
  login,
  loginGoogle,
  register,
  verifyOtp,
  changePassword,
} from "../controllers/auth.controller";
import checkAuth from "../middlewares/checkAuth";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/loginGoogle", loginGoogle);
router.post("/change-password", checkAuth, changePassword);

export default router;
