import MockRound from "../models/MockRound.model.js";
import MockAttempt from "../models/MockAttempt.model.js";
import Student from "../models/Student.model.js";

// ========================
// Admin Controllers
// ========================

// Create a new Mock Round
export const createMockRound = async (req, res) => {
  try {
    const {
      title,
      description,
      studentType,
      isProtected,
      password,
      institute,
      branch,
      durationInMinutes,
      questions,
    } = req.body;

    const mockRound = new MockRound({
      title,
      description,
      studentType,
      isProtected,
      password,
      institute,
      branch,
      durationInMinutes,
      questions,
      createdBy: req.user.id,
    });

    await mockRound.save();
    res.status(201).json({ success: true, mockRound });
  } catch (error) {
    console.error("Create Mock Round Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update an existing Mock Round
export const updateMockRound = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      studentType,
      isProtected,
      password,
      institutes,
      branches,
      durationInMinutes,
      questions,
    } = req.body;

    const mockRound = await MockRound.findById(id);
    if (!mockRound) {
      return res.status(404).json({ success: false, message: "Mock Round not found" });
    }

    mockRound.title = title;
    mockRound.description = description;
    mockRound.studentType = studentType;
    mockRound.isProtected = isProtected;
    mockRound.password = password;
    mockRound.institutes = institutes;
    mockRound.branches = branches;
    mockRound.durationInMinutes = durationInMinutes;
    mockRound.questions = questions;

    await mockRound.save();
    res.status(200).json({ success: true, mockRound });
  } catch (error) {
    console.error("Update Mock Round Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all Mock Rounds (Admin)
export const getAllMockRounds = async (req, res) => {
  try {
    const mockRounds = await MockRound.find({ createdBy: { $exists: true, $ne: null } }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, mockRounds });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get specific Mock Round Details
export const getMockRoundById = async (req, res) => {
  try {
    const mockRound = await MockRound.findById(req.params.id);
    if (!mockRound) {
      return res.status(404).json({ success: false, message: "Mock Round not found" });
    }
    res.status(200).json({ success: true, mockRound });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get Mock Round Results (Admin)
export const getMockRoundResults = async (req, res) => {
  try {
    const { id } = req.params;
    const attempts = await MockAttempt.find({ mockRoundId: id, status: "Completed" })
      .populate("studentId", "name enrollmentNo")
      .select("score studentId completedAt")
      .lean();
    
    res.status(200).json({ success: true, attempts });
  } catch (error) {
    console.error("Get Mock Round Results Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================
// Student Controllers
// ========================

// Get available Mock Rounds for a student
export const getStudentMockRounds = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found" });
    }

    const { studentType } = req.query; // 'IT', 'Non-IT', or undefined
    
    // Find previously completed attempts
    const completedAttempts = await MockAttempt.find({ 
      studentId: student._id, 
      status: "Completed" 
    }).select("mockRoundId");
    
    const completedMockRoundIds = completedAttempts.map(a => a.mockRoundId);

    // Extract student's target matrices
    const studentInstitutes = [student.UGinstitute, student.masters?.PGinstitute].filter(Boolean).map(String);
    const studentBranches = [student.UGbranch, student.masters?.PGbranch].filter(Boolean).map(String);

    let filter = { 
       createdBy: { $exists: true, $ne: null },
       _id: { $nin: completedMockRoundIds },
       $and: [
          {
             $or: [
                { institutes: { $size: 0 } },
                { institutes: "All" },
                { institutes: { $in: studentInstitutes } }
             ]
          },
          {
             $or: [
                { branches: { $size: 0 } },
                { branches: "All" },
                { branches: { $in: studentBranches } }
             ]
          }
       ]
    }; 
    
    if (studentType) {
      filter.studentType = { $in: [studentType, "Both"] };
    }
    
    const mockRounds = await MockRound.find(filter).select("-password -questions.correctAnswer").sort({ createdAt: -1 });
    res.status(200).json({ success: true, mockRounds });
  } catch (error) {
    console.error("Student Mock Round Fetch Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Start a Mock Round Attempt
export const startMockRound = async (req, res) => {
  try {
    const { password } = req.body;
    const mockRoundId = req.params.id;
    const studentId = req.user.id; // User ID; need to find student

    const student = await Student.findOne({ userId: studentId });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found" });
    }

    const mockRound = await MockRound.findById(mockRoundId);
    if (!mockRound) {
      return res.status(404).json({ success: false, message: "Mock Round not found" });
    }

    // Check protection
    if (mockRound.isProtected && mockRound.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    // Create attempt
    const attempt = new MockAttempt({
      studentId: student._id,
      mockRoundId,
      status: "Started",
    });

    await attempt.save();

    // Hide answers before sending to student
    const questionsForStudent = mockRound.questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
      marks: q.marks,
    }));

    res.status(200).json({ 
      success: true, 
      attemptId: attempt._id, 
      questions: questionsForStudent,
      durationInMinutes: mockRound.durationInMinutes 
    });
  } catch (error) {
    console.error("Start Mock Round Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Submit Mock Round
export const submitMockRound = async (req, res) => {
  try {
    const { attemptId, answers } = req.body; // answers is [{ questionId, selectedAnswer }]
    const attempt = await MockAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });

    const mockRound = await MockRound.findById(attempt.mockRoundId);
    if (!mockRound) return res.status(404).json({ success: false, message: "Mock Round not found" });

    let score = 0;
    const finalAnswers = [];

    // Evaluate answers
    for (const ans of answers) {
      const question = mockRound.questions.id(ans.questionId);
      if (question && question.correctAnswer === ans.selectedAnswer) {
        score += question.marks;
      }
      finalAnswers.push({
        questionId: ans.questionId,
        selectedAnswer: ans.selectedAnswer || ""
      });
    }

    attempt.answers = finalAnswers;
    attempt.score = score;
    attempt.status = "Completed";
    attempt.completedAt = new Date();
    
    await attempt.save();

    res.status(200).json({ success: true, score, total: mockRound.questions.reduce((sum, q) => sum + q.marks, 0), attemptId: attempt._id });
  } catch (error) {
    console.error("Submit Mock Round Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getStudentMockHistory = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const attempts = await MockAttempt.find({ studentId: student._id, status: "Completed" })
      .populate("mockRoundId", "title studentType durationInMinutes")
      .sort({ completedAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({ success: true, history: attempts });
  } catch (error) {
    console.error("Get Mock History Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMockAttemptDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const attempt = await MockAttempt.findById(id).populate("mockRoundId").lean();
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });

    // Validate ownership
    const student = await Student.findOne({ userId: req.user.id });
    if (String(attempt.studentId) !== String(student._id)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({ success: true, attempt });
  } catch (error) {
    console.error("Get Mock Attempt Details Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
