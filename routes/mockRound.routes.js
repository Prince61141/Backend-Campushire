import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createMockRound,
  updateMockRound,
  getAllMockRounds,
  getMockRoundById,
  getMockRoundResults,
  getStudentMockRounds,
  startMockRound,
  submitMockRound,
  getStudentMockHistory,
  getMockAttemptDetails
} from "../controllers/mockRound.controller.js";

const router = express.Router();

// Admin Routes
router.post("/admin/create", protect(["admin", "tpo"]), createMockRound);
router.put("/admin/edit/:id", protect(["admin", "tpo"]), updateMockRound);
router.get("/admin", protect(["admin", "tpo"]), getAllMockRounds);
router.get("/admin/:id/results", protect(["admin", "tpo"]), getMockRoundResults);
router.get("/admin/:id", protect(["admin", "tpo"]), getMockRoundById);

// Student Routes
router.get("/student/available", protect(["student"]), getStudentMockRounds);
router.get("/student/history", protect(["student"]), getStudentMockHistory);
router.get("/student/attempt/:id", protect(["student"]), getMockAttemptDetails);
router.post("/student/:id/start", protect(["student"]), startMockRound);
router.post("/student/submit", protect(["student"]), submitMockRound);

export default router;
