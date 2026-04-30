import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { createDrive, listDrives, applyToDrive, getDriveById, listDrivesForAdmin, updateDrive } from "../controllers/drive.controller.js";

const router = express.Router();

// Create a new drive (admin only)
router.post('/', protect(['admin']), createDrive);

// Admin: list all drives
router.get('/admin', protect(['admin']), listDrivesForAdmin);

// Get drive by id (public for students/admin)
router.get('/:id', getDriveById);

// Update drive (admin)
router.put('/:id', protect(['admin']), updateDrive);

// List active drives (student auth to include applied info)
router.get('/', protect(['student']), listDrives);

// Apply to a drive (student only)
router.post('/:id/apply', protect(['student']), applyToDrive);

export default router;
