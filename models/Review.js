import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive' },
  status: { type: String, enum: ['Selected', 'Rejected', 'Interviewing'], required: true },
  experience: { type: String, required: true },
  suggestions: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  isApproved: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Review", reviewSchema);
