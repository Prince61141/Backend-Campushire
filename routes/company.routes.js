import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { logoUpload } from "../middleware/upload.middleware.js";
import {
  createCompany,
  listCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
} from "../controllers/company.controller.js";

const router = express.Router();

// List all companies
router.get("/", listCompanies);

// Create a new company (with optional logo upload)
router.post("/", protect(["admin"]), logoUpload.single("logo"), createCompany);

// Update company with optional logo upload
router.put(
  "/:id",
  protect(["admin"]),
  logoUpload.single("logo"),
  updateCompany,
);

// Single company operations
router.get("/:id", getCompany);
router.put("/:id", protect(["admin"]), updateCompany);
router.delete("/:id", protect(["admin"]), deleteCompany);

export default router;
