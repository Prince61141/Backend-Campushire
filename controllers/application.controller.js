import Application from "../models/Application.js";
import Student from "../models/Student.model.js";
import { sendEmail } from "../utils/sendEmail.js";

// List all applications (admin)
export const listApplications = async (req, res) => {
  try {
    const apps = await Application.find()
      .populate({
        path: "student",
        populate: [
          { path: "UGinstitute", select: "name code" },
          { path: "UGbranch", select: "name code" },
          { path: "masters.PGinstitute", select: "name code" },
          { path: "masters.PGbranch", select: "name code" }
        ]
      })
      .populate({
        path: "drive",
        populate: { path: "company", select: "name logo" },
      })
      .sort({ appliedAt: -1 });
    return res.json(apps);
  } catch (err) {
    console.error("listApplications", err);
    return res.status(500).json({ message: "Failed to list applications" });
  }
};

// Update application status (admin)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Missing status" });

    const app = await Application.findById(id).populate('student').populate('drive');
    if (!app) return res.status(404).json({ message: "Application not found" });

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
        console.error("Failed to send status update email", emailErr);
      }
    }

    return res.json({ message: "Status updated" });
  } catch (err) {
    console.error("updateApplicationStatus", err);
    // handle mongoose validation errors (enum)
    if (err.name === "ValidationError")
      return res.status(400).json({ message: err.message });
    return res.status(500).json({ message: "Failed to update status" });
  }
};

// GET /api/applications/my - list applications for current student
export const getMyApplications = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id }).select(
      "_id",
    );
    if (!student)
      return res.status(404).json({ message: "Student profile not found" });

    const apps = await Application.find({ student: student._id })
      .populate({
        path: "drive",
        populate: { path: "company", select: "name logo" },
      })
      .sort({ appliedAt: -1 });

    return res.json(apps);
  } catch (err) {
    console.error("getMyApplications", err);
    return res.status(500).json({ message: "Failed to fetch applications" });
  }
};

// DELETE /api/applications/:id - withdraw own application (student)
export const withdrawMyApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findOne({ userId: req.user.id }).select(
      "_id",
    );
    if (!student)
      return res.status(404).json({ message: "Student profile not found" });

    const app = await Application.findOne({
      _id: id,
      student: student._id,
    }).populate("drive", "applicationDeadline status");

    if (!app)
      return res.status(404).json({ message: "Application not found" });

    const deadline = app.drive?.applicationDeadline;
    if (deadline && new Date() > new Date(deadline)) {
      return res.status(400).json({
        message: "You can no longer withdraw this application (deadline passed)",
      });
    }

    app.status = "Withdrawn";
    await app.save();

    return res.json({ message: "Application withdrawn", status: app.status });
  } catch (err) {
    console.error("withdrawMyApplication", err);
    return res.status(500).json({ message: "Failed to withdraw application" });
  }
};
