import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import auth from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js";
import companyRoutes from "./routes/company.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import driveRoutes from "./routes/drive.routes.js";
import instituteRoutes from "./routes/institute.routes.js";
import branchRoutes from "./routes/branch.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import eventRoutes from "./routes/event.routes.js";
import mockRoundsRoutes from "./routes/mockRound.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import aiMockRoutes from "./routes/aimock.routes.js";
import publicRoutes from "./routes/public.routes.js";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Log all incoming HTTP requests to the terminal
app.use((req, res, next) => {
	const start = Date.now();
	res.on("finish", () => {
		const duration = Date.now() - start;
		console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
	});
	next();
});

app.use("/api/auth", auth);
app.use("/api/student", studentRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/drive", driveRoutes);
app.use("/api/institute", instituteRoutes);
app.use("/api/branch", branchRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/mock-rounds", mockRoundsRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/ai-mock", aiMockRoutes);
app.use("/api/public", publicRoutes);

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Global error handler (e.g. for multer limits)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	if (err && err.code === "LIMIT_FILE_SIZE") {
		return res.status(400).json({ message: "Resume file too large. Maximum size is 2MB." });
	}
	console.error("Unhandled error", err);
	return res.status(500).json({ message: "Server error" });
});

export default app;