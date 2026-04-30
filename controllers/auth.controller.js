import User from "../models/User.model.js";
import Student from "../models/Student.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

/* STUDENT SIGNUP */
export const studentSignup = async (req, res) => {
  try {
    const { name, email, password, enrollmentNo } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isVerified) {
         return res.status(400).json({ message: "An unverified account already exists with this email. Wait 15m to re-register if token expired." });
      }
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(20).toString("hex");

    const student = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
      isVerified: false,
      verificationToken,
      verificationExpires: Date.now() + 15 * 60 * 1000,
      pendingStudentData: { enrollmentNo }
    });

    const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email/${verificationToken}`;
    const message = `
      <div style="font-family: sans-serif; max-w: 600px; margin: auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">
        <h2 style="color: #0d9488;">Welcome to CampusHire! 🎓</h2>
        <p style="font-size: 16px; color: #475569;">Hi ${name}, verify your account to unlock full platform access.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p style="font-size: 14px; color: #94a3b8;">This link will strictly expire in under 15 minutes. If it does, your registration falls away and you'll need to sign up again.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: student.email,
        subject: "CampusHire - Verify Your Account",
        html: message,
      });

      res.status(201).json({
        message: "Registration successful. Please check your email for the verification link (expires in 15 minutes).",
      });
    } catch (error) {
      await User.findByIdAndDelete(student._id);
      return res.status(500).json({ message: "Email could not be sent. Registration failed." });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* VERIFY EMAIL */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token." });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined; 
    
    // Create actual Student entity securely 
    if (user.role === 'student' && user.pendingStudentData) {
       await Student.create({
          userId: user._id,
          name: user.name,
          email: user.email,
          enrollmentNo: user.pendingStudentData.enrollmentNo
       });
       user.pendingStudentData = undefined;
    }
    
    await user.save();
    
    res.status(200).json({ message: "Email verified successfully. You can now login." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* LOGIN (ALL ROLES) */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "User not found" });

    if (!user.isVerified)
      return res.status(401).json({ message: "Please verify your email address before logging in." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
      name: user.name,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* FORGOT PASSWORD */
export const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: "There is no verified user tracked with that email address." });
    if (!user.isVerified) return res.status(401).json({ message: "Email is not verified yet." });

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;
    const message = `
      <div style="font-family: sans-serif; max-w: 600px; margin: auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">
        <h2 style="color: #4f46e5;">Password Reset Request</h2>
        <p style="font-size: 16px; color: #475569;">You requested a password reset. Click the secured link below to securely set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #94a3b8;">This exact link resets strictly within 10 minutes. Please disregard if not initiated.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "CampusHire - Password Reset Action",
        html: message,
      });
      res.status(200).json({ message: "Password reset sequence emailed safely." });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(500).json({ message: "Email infrastructure could not be reached currently." });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* RESET PASSWORD */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Recovery token is invalid or has unfortunately expired." });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been successfully updated! You may now login natively." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
