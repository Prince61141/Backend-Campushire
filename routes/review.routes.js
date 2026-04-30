import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  addReview,
  getReviewableOptions,
  getMyReviews,
  getAllReviews,
  getPendingReviews,
  approveReview,
  rejectReview
} from "../controllers/review.controller.js";

const router = express.Router();

// General public/student endpoint
router.get("/all", protect(["student", "admin", "tpo"]), getAllReviews);

// Student endpoints
router.get("/my", protect(["student"]), getMyReviews);
router.get("/options", protect(["student"]), getReviewableOptions);
router.post("/add", protect(["student"]), addReview);

// Admin Moderation endpoints
router.get("/admin/pending", protect(["admin"]), getPendingReviews);
router.put("/admin/:id/approve", protect(["admin"]), approveReview);
router.put("/admin/:id/reject", protect(["admin"]), rejectReview);

export default router;
