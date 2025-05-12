import { Router } from "express";
import {
  login,
  loginGoogle,
  register,
  verifyOtp,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
// router.post("/verify-otp", verifyOtp);
// router.post("/login", login);
// router.post("/loginGoogle", loginGoogle);



export default router;