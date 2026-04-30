import Student from "../models/Student.model.js";
import Institute from "../models/institute.js";
import Branch from "../models/branch.js";
import cloudinary from "../config/cloudinary.js";

export const getProfile = async (req, res) => {
  try {
    const profile = await Student.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(profile);
  } catch (err) {
    console.error("GET /student/profile error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const update = req.body || {};

    if (update.masters && typeof update.masters !== "object") {
      update.masters = {};
    }

    const profile = await Student.findOneAndUpdate(
      { userId: req.user.id },
      { $set: update },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json({ message: "Profile updated", profile });
  } catch (err) {
    console.error("PUT /student/profile error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // get profile to read enrollmentNo for naming
    const profile = await Student.findOne({ userId: req.user.id });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const buffer = req.file.buffer;
    if (!buffer) return res.status(400).json({ message: "File buffer missing" });

    const publicIdBase = `${profile.name}_CV`;

    const uploadFromBuffer = (buf, public_id) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "campushire", resource_type: "auto", public_id },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(buf);
      });

    const uploadRes = await uploadFromBuffer(buffer, publicIdBase);
    const url = uploadRes?.secure_url || uploadRes?.url;

    // save to profile (append to array)
    const existing = Array.isArray(profile.resumeUrl) ? profile.resumeUrl : [];
    const final = [...existing, url].slice(0, 2);
    profile.resumeUrl = final;
    await profile.save();

    res.json({ message: "Resume uploaded", url, profile });
  } catch (err) {
    console.error("POST /student/resume error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteResume = async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ message: "Resume url is required" });
    }

    const profile = await Student.findOne({ userId: req.user.id });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const existing = Array.isArray(profile.resumeUrl) ? profile.resumeUrl : [];
    const updated = existing.filter((u) => u !== url);
    profile.resumeUrl = updated;
    await profile.save();

    // Optionally delete from Cloudinary if URL belongs to our cloud
    try {
      const cloudinaryUrl = new URL(url);
      if (cloudinaryUrl.hostname.includes("res.cloudinary.com")) {
        const pathParts = cloudinaryUrl.pathname.split("/");
        const publicIdWithExt = pathParts[pathParts.length - 1];
        const folderParts = pathParts.slice(1, -1); // drop leading empty and last file
        const folder = folderParts.join("/");
        const dotIndex = publicIdWithExt.lastIndexOf(".");
        const publicId = dotIndex > 0 ? publicIdWithExt.slice(0, dotIndex) : publicIdWithExt;
        const fullPublicId = folder ? `${folder}/${publicId}` : publicId;
        await cloudinary.uploader.destroy(fullPublicId, { resource_type: "raw" });
      }
    } catch (_) {
      // ignore cloudinary delete errors, profile already updated
    }

    res.json({ message: "Resume removed", resumeUrl: updated, profile });
  } catch (err) {
    console.error("DELETE /student/resume error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const listUGInstitutes = async (_req, res) => {
  try {
    const institutes = await Institute.find({ active: true }).select("name code").sort({ name: 1 });
    res.json(institutes);
  } catch (err) {
    console.error("GET /student/ug/institutes error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const listUGBranches = async (req, res) => {
  try {
    const { instituteName } = req.query;
    if (!instituteName) return res.status(400).json({ message: "instituteName is required" });
    const inst = await Institute.findOne({ name: instituteName });
    if (!inst) return res.json([]);
    const branches = await Branch.find({ institute: inst._id, active: true }).select("name code").sort({ name: 1 });
    res.json(branches);
  } catch (err) {
    console.error("GET /student/ug/branches error", err);
    res.status(500).json({ message: "Server error" });
  }
};