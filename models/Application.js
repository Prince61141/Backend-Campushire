import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    roles: [
      {
        roleName: { type: String, required: true },
      },
    ],
    status: {
      type: String,
      default: "Applied",
    },
    notes: {
      type: String,
    },
    studentSnapshot: {
      resumeUrl: String,
      sscPercentage: Number,
      hscPercentage: Number,
      optionAfter10th: String,
      cgpa: Number,
      activeBacklogs: Number,
      totalBacklogs: Number,
      degreeType: String,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Ensure one application per student per drive
applicationSchema.index({ drive: 1, student: 1 }, { unique: true });

export default mongoose.model("Application", applicationSchema);
