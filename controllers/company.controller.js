import Company from "../models/Company.js";
import cloudinary from "../config/cloudinary.js";

const uploadLogoFromBuffer = (buffer, public_id) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "campushire/companies", resource_type: "image", public_id },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );
    stream.end(buffer);
  });

export const createCompany = async (req, res) => {
  try {
    const {
      name,
      email,
      contactPerson,
      phone,
      location,
      website,
      description,
    } = req.body;

    if (!name || !email || !contactPerson) {
      return res
        .status(400)
        .json({ message: "Name, email and contact person are required" });
    }

    const existing = await Company.findOne({ name });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Company with this name already exists" });
    }

    let logoUrl;
    if (req.file && req.file.buffer) {
      try {
        const safeName = (name || "company")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
        const publicId = `${safeName}-logo-${Date.now()}`;
        const uploadRes = await uploadLogoFromBuffer(req.file.buffer, publicId);
        logoUrl = uploadRes?.secure_url || uploadRes?.url;
      } catch (uploadErr) {
        console.error("Cloudinary logo upload error", uploadErr);
      }
    }

    const company = await Company.create({
      name,
      email,
      contactPerson,
      phone,
      location,
      website,
      description,
      logo: logoUrl,
    });

    return res.status(201).json({ message: "Company created", company });
  } catch (err) {
    console.error("POST /company error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const listCompanies = async (_req, res) => {
  try {
    const companies = await Company.find().sort({ updatedAt: -1 });
    return res.json(companies);
  } catch (err) {
    console.error("GET /company error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    return res.json(company);
  } catch (err) {
    console.error("GET /company/:id error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const updates = req.body || {};

    // If a logo file is uploaded, upload to Cloudinary and set logo URL
    if (req.file && req.file.buffer) {
      try {
        const safeName = (updates.name || "company")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
        const publicId = `${safeName}-logo-${Date.now()}`;
        const uploadRes = await uploadLogoFromBuffer(req.file.buffer, publicId);
        if (uploadRes) {
          updates.logo = uploadRes.secure_url || uploadRes.url;
        }
      } catch (uploadErr) {
        console.error("Cloudinary logo upload error (update)", uploadErr);
      }
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true },
    );
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    return res.json({ message: "Company updated", company });
  } catch (err) {
    console.error("PUT /company/:id error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    return res.json({ message: "Company deleted" });
  } catch (err) {
    console.error("DELETE /company/:id error", err);
    return res.status(500).json({ message: "Server error" });
  }
};
