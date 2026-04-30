import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
	listApplications,
	updateApplicationStatus,
	getMyApplications,
	withdrawMyApplication,
} from "../controllers/application.controller.js";

const router = express.Router();

// GET /api/applications - list all (admin)
router.get("/", protect(["admin"]), listApplications);

// GET /api/applications/my - list current student's applications
router.get("/my", protect(["student"]), getMyApplications);

// DELETE /api/applications/:id - withdraw own application (student)
router.delete("/:id/withdraw", protect(["student"]), withdrawMyApplication);

// PUT /api/applications/:id/status - update status (admin)
router.put("/:id/status", protect(["admin"]), updateApplicationStatus);

export default router;
