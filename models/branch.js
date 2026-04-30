import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

branchSchema.index({ code: 1, institute: 1 }, { unique: true });

export default mongoose.model("Branch", branchSchema);
