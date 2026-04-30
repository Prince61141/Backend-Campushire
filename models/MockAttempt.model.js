import mongoose from "mongoose";

const mockAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    mockRoundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MockRound",
      required: true,
    },
    score: { type: Number, default: 0 },
    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId },
        selectedAnswer: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ["Started", "Completed"],
      default: "Started",
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("MockAttempt", mockAttemptSchema);
