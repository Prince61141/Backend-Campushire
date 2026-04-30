import express from "express";
import multer from "multer";
import { uploadFiles } from "../controllers/upload.controller.js";

const router = express.Router();

// store uploads temporarily on disk (will be removed after Cloudinary upload)
const upload = multer({ dest: "uploads/" });

// POST /api/upload - accepts files in field `documents`
router.post("/", upload.array("documents"), uploadFiles);

export default router;
