import express from "express";
import Student from "../models/Student.model.js";
import Company from "../models/Company.js";
import Review from "../models/Review.js";
import PlacedStudent from "../models/PlacedStudents.js";
import Drive from "../models/Drive.js";
import Application from "../models/Application.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

// GET /api/public/placement-achievements
router.get("/placement-achievements", async (req, res) => {
  try {
    const { institute, branch } = req.query;
    const query = { isPublished: true };
    if (institute) query.instituteName = institute;
    if (branch) query.branchName = branch;

    const achievements = await PlacedStudent.find(query)
      .sort({ updatedAt: -1 })
      .lean();
    
    res.json(achievements);
  } catch (err) {
    console.error("GET /api/public/placement-achievements error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/public/companies
router.get("/companies", async (req, res) => {
  try {
    const companies = await Company.find({})
      .select("name logo description website location contactPerson email")
      .sort({ name: 1 })
      .lean();
    res.json(companies);
  } catch (err) {
    console.error("GET /api/public/companies error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/public/reviews
router.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({ isApproved: true })
      .populate("student", "name achievementMessage")
      .populate("company", "name logo")
      .populate("drive", "title")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(reviews);
  } catch (err) {
    console.error("GET /api/public/reviews error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/public/hr-share/:id - Authenticate and fetch HR applications
router.post("/hr-share/:id", async (req, res) => {
  try {
    const { hrAccessCode } = req.body;
    const drive = await Drive.findById(req.params.id)
      .populate("company", "name logo")
      .lean();

    if (!drive || !drive.isHrShared || drive.hrAccessCode !== hrAccessCode) {
      return res.status(401).json({ message: "Invalid access code or link disabled" });
    }

    const applications = await Application.find({ drive: req.params.id })
      .populate({
        path: "student",
        populate: [
          { path: "UGinstitute", select: "name code" },
          { path: "UGbranch", select: "name code" },
          { path: "masters.PGinstitute", select: "name code" },
          { path: "masters.PGbranch", select: "name code" }
        ]
      })
      .lean();

    res.json({ drive, applications });
  } catch (err) {
    console.error("POST /api/public/hr-share/:id error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/public/hr-share/application/:appId - HR update application status
router.put("/hr-share/application/:appId", async (req, res) => {
  try {
    const { hrAccessCode, status } = req.body;
    
    if (!status) return res.status(400).json({ message: "Missing status" });

    const app = await Application.findById(req.params.appId).populate("drive").populate("student");
    if (!app) return res.status(404).json({ message: "Application not found" });

    const drive = await Drive.findById(app.drive._id);

    if (!drive || !drive.isHrShared || drive.hrAccessCode !== hrAccessCode) {
      return res.status(401).json({ message: "Invalid access code" });
    }

    app.status = status;
    await app.save();

    if (app.student) {
      if (status.toLowerCase() === 'selected' || status.toLowerCase() === 'offer' || status.toLowerCase() === 'hired') {
        app.student.placementStatus = "Placed";
        await app.student.save();
      }

      try {
        await sendEmail({
          email: app.student.email,
          subject: `Application Status Updated: ${app.drive?.title || 'Placement Drive'}`,
          html: `
            <h3>Application Status Update</h3>
            <p>Dear ${app.student.name},</p>
            <p>Your application status for <strong>${app.drive?.title || 'the drive'}</strong> has been updated to: <strong>${status}</strong>.</p>
            <p>Log in to your CampusHire dashboard to view more details.</p>
            <br/>
            <p>Best Regards,</p>
            <p>CampusHire Team</p>
          `
        });
      } catch (emailErr) {
        console.error("Failed to send status update email from HR", emailErr);
      }
    }

    res.json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("PUT /api/public/hr-share/application/:appId error", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
