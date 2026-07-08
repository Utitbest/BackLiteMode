import express from "express";
import {
  super_Admin,
  register,
  login,
  verifyEmail,
  resendCode,
  forgotPassword,
  resetPassword,
  getMe,
  logout
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";


const router = express.Router();
router.post("/super_login", super_Admin)
router.get("/me", protect, getMe);
router.post("/logout", logout);
router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-code", resendCode);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;