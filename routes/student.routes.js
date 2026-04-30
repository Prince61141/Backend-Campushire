import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getProfile, updateProfile, uploadResume, deleteResume, listUGInstitutes, listUGBranches } from "../controllers/student.controller.js";
import { resumeUpload } from "../middleware/upload.middleware.js";

const router = express.Router();

// Get current student's profile
router.get("/profile", protect(["student"]), getProfile);

// Update current student's profile
router.put("/profile", protect(["student"]), updateProfile);

// Upload resume file
router.post(
	"/resume",
	protect(["student"]),
	resumeUpload.single("resume"),
	uploadResume
);

// Delete a resume by URL
router.delete(
	"/resume",
	protect(["student"]),
	deleteResume
);

// UG institutes and branches
router.get("/ug/institutes", protect(["student"]), listUGInstitutes);
router.get("/ug/branches", protect(["student"]), listUGBranches);

export default router;
