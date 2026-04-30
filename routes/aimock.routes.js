import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getEligibleDrives, generateMockTest, evaluateMockTest } from "../controllers/aiMock.controller.js";

const router = express.Router();

router.get("/available-drives", protect(["student"]), getEligibleDrives);
router.post("/generate/:applicationId", protect(["student"]), generateMockTest);
router.post("/evaluate", protect(["student"]), evaluateMockTest);

export default router;
