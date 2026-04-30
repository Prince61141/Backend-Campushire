import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { logoUpload } from "../middleware/upload.middleware.js";
import {
	listStudents,
	exportStudentsCSV,
	getStudentById,
	getDashboardStats,
	updatePlacementAchievement,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/dashboard-stats", protect(["admin"]), getDashboardStats);

// Students listing for admin
router.get("/students", protect(["admin"]), listStudents);
router.get("/students/export", protect(["admin"]), exportStudentsCSV);
router.get("/students/:id", protect(["admin"]), getStudentById);
router.put(
	"/students/:id/achievement",
	protect(["admin"]),
	logoUpload.single("placedPhoto"),
	updatePlacementAchievement,
);


export default router;
