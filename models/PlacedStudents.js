import mongoose from "mongoose";

const placedStudentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    name: { type: String, required: true },
    enrollmentNo: { type: String },
    passoutYear: { type: Number },

    // store branch and institute as both id refs and readable names
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
    branchName: { type: String },
    branchCode: { type: String },
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute" },
    instituteName: { type: String },
    instituteCode: { type: String },

    // company and drive info
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    companyName: { type: String },
    ApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    driveTitle: { type: String },
    jobRole: { type: String },

    placedPhoto: { type: String },
    achievementMessage: { type: String },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("PlacedStudent", placedStudentSchema);
