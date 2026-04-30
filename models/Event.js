import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    datetime: { type: Date, required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("Event", eventSchema);
