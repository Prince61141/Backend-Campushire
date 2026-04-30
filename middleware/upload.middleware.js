import multer from "multer";

// Use memory storage to avoid writing files to disk; controllers will upload to Cloudinary
const storage = multer.memoryStorage();

// Resume (PDF) uploads
const resumeFileFilter = (_req, file, cb) => {
  const allowedExt = [".pdf"];
  const orig = (file.originalname || "").toLowerCase();
  const matched = allowedExt.some((ext) => orig.endsWith(ext));
  if (matched) cb(null, true);
  else cb(new Error("Only PDF files are allowed"));
};

// limit to 2MB per resume
export const resumeUpload = multer({
  storage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: 4 * 1024 * 1024 },
});

// Company logo uploads (images)
const logoFileFilter = (_req, file, cb) => {
  const allowedExt = [".png", ".jpg", ".jpeg", ".webp"];
  const orig = (file.originalname || "").toLowerCase();
  const matched = allowedExt.some((ext) => orig.endsWith(ext));
  if (matched) cb(null, true);
  else cb(new Error("Only image files (PNG, JPG, JPEG, WEBP) are allowed"));
};

export const logoUpload = multer({
  storage,
  fileFilter: logoFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});
