import express from "express";
import { studentSignup, login, verifyEmail, forgotPassword, resetPassword } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup/student", studentSignup);
router.post("/login", login);

// Account Recovery & Verification Routes
router.get("/verify-email/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;