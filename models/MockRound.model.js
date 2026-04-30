import mongoose from "mongoose";

const mockRoundSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    studentType: {
      type: String,
      enum: ["IT", "Non-IT", "Both"],
      default: "Both",
    },
    isProtected: { type: Boolean, default: true },
    password: { type: String }, 
    institutes: { type: [String], default: [] },
    branches: { type: [String], default: [] },
    questions: [
      {
        questionText: { type: String, required: true },
        type: { type: String, enum: ['mcq', 'coding'], default: 'mcq' },
        options: [{ type: String }],
        correctAnswer: { type: String, required: true },
        marks: { type: Number, default: 1 },
        testCases: [
          {
            input: { type: String },
            expectedOutput: { type: String }
          }
        ]
      },
    ],
    durationInMinutes: { type: Number, default: 30 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("MockRound", mockRoundSchema);
