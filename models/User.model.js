import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "student", "company"],
      default: "student",
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationExpires: {
      type: Date,
      expires: 0 // document deleted automatically at the specified Date
    },
    pendingStudentData: {
      enrollmentNo: String
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);