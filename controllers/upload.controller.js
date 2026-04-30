import fs from "fs";
import path from "path";
import cloudinary from "../config/cloudinary.js";

// Upload files saved by multer (disk storage) to Cloudinary
export const uploadFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files provided" });
    }

    const uploaded = [];
    for (const file of req.files) {
      // upload to cloudinary
      // file.path is the temp path created by multer
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "drives",
      });

      uploaded.push({ fileName: file.originalname, url: result.secure_url, public_id: result.public_id });

      // remove temp file
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // non-fatal
        console.warn("Failed to remove temp file", file.path, e.message);
      }
    }

    return res.json({ files: uploaded });
  } catch (err) {
    console.error("POST /upload error", err);
    return res.status(500).json({ message: "Upload failed" });
  }
};

export default { uploadFiles };
