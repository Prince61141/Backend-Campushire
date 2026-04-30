import mongoose from "mongoose";

const driveSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // Split job description into separate fields
    roleOverview: { type: String, required: true },
    keyResponsibilities: { type: String, required: true },

    // Required skills for the role
    skills: [{ type: String }],

    roles: [
      {
        roleName: { type: String, required: true },
      },
    ],

    allowMultipleRoles: { type: Boolean, default: false },

    jobType: {
      type: String,
      enum: ["Full Time", "Internship", "Internship + PPO"],
      default: "Internship + PPO",
    },

    package: { type: String }, // Added: package/salary

    location: { type: String },

    workMode: { type: String, enum: ["Onsite", "Remote", "Hybrid"] }, // Added

    eligibility: {
      institute: [{ type: String }],
      branches: [{ type: String }],
      min10thPercentage: { type: Number, default: 0 },
      min12thPercentage: { type: Number, default: 0 },
      allowActiveBacklogs: { type: Boolean, default: true },
      maxTotalBacklogs: { type: Number, default: 10 },
      minCGPA: { type: Number, default: 5 },
      passoutYear: [{ type: String }],
      allowPlacedStudents: { type: Boolean, default: false }, // Added
    },

    applicationDeadline: { type: String, required: true },
    expectedJoiningDate: { type: Date }, // Added
    expectedDriveDate: { type: Date },

    selectionProcess: {
      roundsFinalized: { type: Boolean, default: false },
      datesAnnounced: { type: Boolean, default: false },
      rounds: [
        {
          roundName: { type: String },
          roundDate: { type: Date },
          roundTime: { type: String },
        },
      ],
    },

    documents: [
      {
        fileName: { type: String },
        filePath: { type: String },
        public_id: { type: String },
      },
    ], // Added

    applicationInstructions: { type: String },

    status: {
      type: String,
      enum: ["Open", "Interviewing", "Completed", "Cancelled"],
      default: "Open",
    },

    isActive: { type: Boolean, default: true },
    hrAccessCode: { type: String },
    isHrShared: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Drive", driveSchema);
