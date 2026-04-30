import Review from "../models/Review.js";
import Student from "../models/Student.model.js";
import Application from "../models/Application.js";

// Add a new review
export const addReview = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const { driveId, companyId, status, experience, suggestions, rating } =
      req.body;

    if (!driveId || !companyId) {
      return res
        .status(400)
        .json({ message: "driveId and companyId are required" });
    }

    // Optional: ensure the student actually has an application for this drive
    const hasApplication = await Application.findOne({
      student: student._id,
      drive: driveId,
    }).lean();

    if (!hasApplication) {
      return res
        .status(400)
        .json({ message: "No application found for this drive" });
    }

    const review = new Review({
      student: student._id,
      company: companyId,
      drive: driveId,
      status,
      experience,
      suggestions,
      rating,
    });

    await review.save();

    return res.status(201).json({
      success: true,
      message: "Review added successfully",
      review,
    });
  } catch (err) {
    console.error("Add review error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get student's eligible drives/companies to review
export const getReviewableOptions = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Find applications and populate drive + company
    const apps = await Application.find({ student: student._id }).populate({
      path: "drive",
      populate: { path: "company", select: "name logo" },
    });

    // Filter applications where status is Interview, Process, Reject, or Offer
    const eligibleApps = apps.filter((app) => {
      const s = app.status ? app.status.toLowerCase() : "";
      return (
        s.includes("offer") ||
        s.includes("reject") ||
        s.includes("interview") ||
        s.includes("process")
      );
    });

    // Map to simple objects for dropdowns, removing duplicates if necessary
    const options = eligibleApps.map((app) => {
      const role =
        app.roles && app.roles[0] && app.roles[0].roleName
          ? app.roles[0].roleName
          : "Software Engineer";
      return {
        _id: app._id,
        driveId: app.drive?._id,
        company: app.drive?.company,
        role: role,
        originalStatus: app.status,
      };
    });

    // We can also see which ones the student has already reviewed
    const existingReviews = await Review.find({ student: student._id }).select(
      "drive",
    );
    const reviewedDriveIds = existingReviews.map((r) => r.drive?.toString());

    // Flag options that are already reviewed
    const finalOptions = options.map((opt) => ({
      ...opt,
      alreadyReviewed: reviewedDriveIds.includes(opt.driveId?.toString()),
    }));

    return res.json({ success: true, options: finalOptions });
  } catch (err) {
    console.error("Get reviewable options error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get reviews written by the logged-in student
export const getMyReviews = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });
    const reviews = await Review.find({ student: student._id })
      .populate("company", "name logo")
      .populate("drive", "title jobType")
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    console.error("Get my reviews error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all approved reviews for public or student view
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isApproved: true })
      .populate("company", "name logo")
      .populate("student", "name")
      .populate("drive", "title jobType")
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Get all unapproved reviews
export const getPendingReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isApproved: false })
      .populate("company", "name logo")
      .populate("student", "name profile.program profile.branch")
      .populate("drive", "title jobType")
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    console.error("Get pending reviews error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Approve a review
export const approveReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByIdAndUpdate(
      id,
      { isApproved: true },
      { new: true },
    );
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({
      success: true,
      message: "Review approved successfully",
      review,
    });
  } catch (err) {
    console.error("Approve review error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Reject (delete) a review
export const rejectReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByIdAndDelete(id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({ success: true, message: "Review rejected and removed" });
  } catch (err) {
    console.error("Reject review error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
