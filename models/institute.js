import mongoose from "mongoose";

const instituteSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

instituteSchema.index({ code: 1 }, { unique: true });

export default mongoose.model("Institute", instituteSchema);