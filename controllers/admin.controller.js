import Student from "../models/Student.model.js";
import { Parser } from "json2csv";
import Branch from "../models/branch.js";
import Institute from "../models/institute.js";
import Company from "../models/Company.js";
import Drive from "../models/Drive.js";
import Application from "../models/Application.js";
import PlacedStudent from "../models/PlacedStudents.js";
import cloudinary from "../config/cloudinary.js";

export const listStudents = async (req, res) => {
  try {
    const { q, eligible, placed, degree, branch, institute, passoutYear, published, awaiting } =
      req.query;
    const and = [];

    if (typeof eligible !== "undefined")
      and.push({ isEligible: eligible === "true" });

    if (typeof placed !== "undefined")
      and.push({
        placementStatus: placed === "true" ? "Placed" : "Not Placed",
      });

    if (typeof published !== "undefined")
      and.push({ isPublished: published === "true" });

    // If awaiting=true, we want students who have an application with an offer/selected/hired status
    // and that are not yet published on the Wall of Fame (isPublished=false). We will resolve
    // matching student ids from the Application collection and restrict the student query to them.
    if (awaiting === "true") {
      // find applications with statuses indicating an offer/selection
      const appMatches = await Application.find({ status: { $regex: /(offer|selected|hired)/i } }).select("student").lean();
      const studentIds = Array.from(new Set(appMatches.map(a => String(a.student))));
      if (studentIds.length === 0) {
        return res.json([]);
      }
      and.push({ _id: { $in: studentIds } });
      // ensure only unpublished achievements are returned for the awaiting list
      and.push({ isPublished: false });
    }


    if (degree === "pg") and.push({ "masters.hasMasters": true });
    if (degree === "ug") and.push({ "masters.hasMasters": false });

    if (q) {
      const re = new RegExp(q, "i");
      and.push({ $or: [{ name: re }, { enrollmentNo: re }, { email: re }, { companyName: re }] });
    }

    if (branch) {
      const branchDoc = await Branch.findOne({ code: branch });
      if (branchDoc) {
        and.push({
          $or: [
            { UGbranch: branchDoc._id },
            { "masters.PGbranch": branchDoc._id },
          ],
        });
      }
    }

    if (institute) {
      const instDoc = await Institute.findOne({ name: institute });
      if (instDoc) {
        and.push({
          $or: [
            { UGinstitute: instDoc._id },
            { "masters.PGinstitute": instDoc._id },
          ],
        });
      }
    }

    if (passoutYear) {
      const yr = Number(passoutYear);
      if (!Number.isNaN(yr)) {
        and.push({
          $or: [{ UGpassoutYear: yr }, { "masters.PGpassoutYear": yr }],
        });
      }
    }

    // NEW: If filtered for PUBLISHED, we use PlacedStudent collection as source of truth
    if (published === "true") {
      const psQuery = {};
      if (q) psQuery.$or = [{ name: new RegExp(q, "i") }, { enrollmentNo: new RegExp(q, "i") }, { companyName: new RegExp(q, "i") }];
      if (institute) psQuery.instituteName = institute;
      if (branch) psQuery.branchCode = branch;

      const psRecords = await PlacedStudent.find(psQuery)
        .populate({
          path: "student",
          select: "email phone UGcgpa masters UGinstitute UGbranch UGpassoutYear",
          populate: [
            { path: "UGbranch", select: "name code" },
            { path: "UGinstitute", select: "name code" }
          ]
        })
        .sort({ updatedAt: -1 })
        .lean();

      const merged = psRecords.map(p => ({
        ...p.student, // Base student data
        ...p,          // Override with placement snapshot (placedPhoto, achievementMessage, etc.)
        _id: p.student?._id || p._id, // Keep student ID for actions
        isPublished: true,
        // Ensure UI names match
        UGbranch: p.student?.UGbranch || { name: p.branchName, code: p.branchCode },
        UGinstitute: p.student?.UGinstitute || { name: p.instituteName, code: p.instituteCode },
        UGpassoutYear: p.passoutYear || p.student?.UGpassoutYear,
        jobRole: p.jobRole,
      }));

      return res.json(merged);
    }

    // Default: Query from Student model (for Awaiting/General list)
    const queryObj = and.length ? { $and: and } : {};

    const students = await Student.find(queryObj)
      .select(
        "name enrollmentNo email phone UGcgpa isEligible placementStatus masters UGinstitute UGbranch UGpassoutYear placedPhoto achievementMessage isPublished companyName",
      )
      .populate("UGbranch", "name code")
      .populate("UGinstitute", "name code")
      .populate("masters.PGbranch", "name code")
      .populate("masters.PGinstitute", "name code")
      .sort({ createdAt: -1 })
      .lean();

    // AWAITING SCAN: Only when explicitly requested (awaiting=true) return students
    // inferred from applications that have offers/selection and are not yet in PlacedStudent.
    if (published === "false" && awaiting === "true") {
      const offeredApps = await Application.find({ 
        status: { $regex: /(offer|selected|hired|placed)/i } 
      })
      .sort({ createdAt: -1 })
      .populate({ path: "drive", populate: { path: "company" } })
      .populate({
        path: "student",
        populate: [
          { path: "UGbranch", select: "name code" },
          { path: "UGinstitute", select: "name code" }
        ]
      })
      .lean();

      // Get all ApplicationIds already in PlacedStudent
      const placedApps = await PlacedStudent.find({}).select("ApplicationId").lean();
      const placedAppIds = new Set(placedApps.map(p => String(p.ApplicationId)));

      // Filter apps that aren't synced yet
      const awaitingList = [];
      for (const app of offeredApps) {
        if (!app.student) continue;
        if (placedAppIds.has(String(app._id))) continue;

        awaitingList.push({
          ...app.student,
          companyName: app.drive?.company?.name || "",
          driveTitle: app.drive?.title || "",
          jobRole: app.roles?.[0]?.roleName || "Software Engineer",
          ApplicationId: app._id,
          isPublished: false
        });
      }

      return res.json(awaitingList);
    }
    
    // Otherwise return the regular students result
    return res.json(students);
  } catch (err) {
    console.error("GET /admin/students error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
     const totalStudents = await Student.countDocuments();
     const placedStudents = await Student.countDocuments({ placementStatus: "Placed" });
     const activeCompanies = await Company.countDocuments({ isActive: true });
     const openDrives = await Drive.countDocuments({ status: { $in: ["Open", "Interviewing"] }, isActive: true });
     
     // Placement Rate
     const placementRate = totalStudents > 0 ? ((placedStudents / totalStudents) * 100).toFixed(1) : 0;
     
     // Top Recruiters based on recent application volumes
     const topDriveApplications = await Application.aggregate([
       { $group: { _id: "$drive", count: { $sum: 1 } } },
       { $sort: { count: -1 } },
       { $limit: 5 }
     ]);
     
     const topRecruiters = await Drive.populate(topDriveApplications, { path: "_id", select: "company title", populate: { path: "company", select: "name" } });
     
     const mappedRecruiters = topRecruiters.map(r => ({
        name: r._id?.company?.name || "Unknown Co.",
        count: r.count
     }));

     // Recent Active Job Postings
     const activeJobs = await Drive.find({ status: { $in: ["Open", "Interviewing"] }, isActive: true })
        .populate("company", "name")
        .sort({ createdAt: -1 })
        .limit(4)
        .lean();
        
      // Mock Trend Data (Because exact dates array of placement statuses aren't fully historically tracked in schema easily locally)
      const trendData = [
         { month: "Aug", placements: Math.floor(placedStudents * 0.1) },
         { month: "Sep", placements: Math.floor(placedStudents * 0.2) },
         { month: "Oct", placements: Math.floor(placedStudents * 0.4) },
         { month: "Nov", placements: Math.floor(placedStudents * 0.6) },
         { month: "Dec", placements: Math.floor(placedStudents * 0.8) },
         { month: "Jan", placements: placedStudents },
      ];
      
      const departmentData = await Student.aggregate([
         { $match: { placementStatus: "Placed" } },
         { $lookup: { from: "branches", localField: "UGbranch", foreignField: "_id", as: "branchDoc" } },
         { $unwind: { path: "$branchDoc", preserveNullAndEmptyArrays: true } },
         { $group: { _id: "$branchDoc.name", value: { $sum: 1 } } },
         { $project: { name: "$_id", value: 1, _id: 0 } }
      ]);
      
      const safeDeptData = departmentData.filter(d => d.name).slice(0, 6);

     res.json({
        stats: {
           totalStudents,
           placedStudents,
           activeCompanies,
           placementRate: `${placementRate}%`,
           openDrives
        },
        topRecruiters: mappedRecruiters.length > 0 ? mappedRecruiters : [ { name: "No Data", count: 0 } ],
        activeJobs: activeJobs.map(j => ({ id: j._id, title: j.title, company: j.company?.name || "Company" })),
        trendData,
        departmentData: safeDeptData.length > 0 ? safeDeptData : [{ name: "General", value: placedStudents || 1 }]
     });
  } catch (err) {
     console.error("GET /admin/dashboard-stats error", err);
     res.status(500).json({ message: "Server error generating dashboard statistics." });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id).lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    console.error("GET /admin/students/:id error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const exportStudentsCSV = async (req, res) => {
  try {
    const { q, eligible, placed, degree, branch, institute, passoutYear } =
      req.query;
    const and = [];

    if (typeof eligible !== "undefined")
      and.push({ isEligible: eligible === "true" });
    if (typeof placed !== "undefined")
      and.push({
        placementStatus: placed === "true" ? "Placed" : "Not Placed",
      });
    if (degree === "pg") and.push({ "masters.hasMasters": true });
    if (degree === "ug") and.push({ "masters.hasMasters": false });
    if (q) {
      const re = new RegExp(q, "i");
      and.push({ $or: [{ name: re }, { enrollmentNo: re }, { email: re }] });
    }
    if (branch) {
      const re = new RegExp(branch, "i");
      and.push({ $or: [{ UGbranch: re }, { "masters.PGbranch": re }] });
    }
    if (institute) {
      const re = new RegExp(institute, "i");
      and.push({ $or: [{ UGinstitute: re }, { "masters.PGinstitute": re }] });
    }
    if (passoutYear) {
      const yr = Number(passoutYear);
      if (!Number.isNaN(yr)) {
        and.push({
          $or: [{ UGpassoutYear: yr }, { "masters.PGpassoutYear": yr }],
        });
      }
    }

    const queryObj = and.length ? { $and: and } : {};

    const students = await Student.find(queryObj)
      .select(
        "name enrollmentNo email UGcgpa UGbranch UGinstitute isEligible placementStatus UGpassoutYear masters",
      )
      .sort({ createdAt: -1 })
      .lean();

    // Flatten masters fields for CSV output
    const mapped = students.map((s) => ({
      name: s.name,
      enrollmentNo: s.enrollmentNo,
      email: s.email,
      branch: s.masters?.hasMasters
        ? s.masters?.PGbranch || ""
        : s.UGbranch || "",
      institute: s.masters?.hasMasters
        ? s.masters?.PGinstitute || ""
        : s.UGinstitute || "",
      cgpa: s.masters?.hasMasters
        ? (s.masters?.PGcgpa ?? "")
        : (s.UGcgpa ?? ""),
      degree: s.masters?.hasMasters ? "Masters" : "Bachelors",
      passoutYear: s.masters?.hasMasters
        ? (s.masters?.PGpassoutYear ?? "")
        : (s.UGpassoutYear ?? ""),
      isEligible: s.isEligible,
      placementStatus: s.placementStatus,
    }));

    const fields = [
      "name",
      "enrollmentNo",
      "email",
      "branch",
      "institute",
      "cgpa",
      "degree",
      "passoutYear",
      "isEligible",
      "placementStatus",
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(mapped);
    res.header("Content-Type", "text/csv");
    res.attachment("students.csv");
    return res.send(csv);
  } catch (err) {
    console.error("GET /admin/students/export error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updatePlacementAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    let { achievementMessage, isPublished, companyName, placedPhoto, ApplicationId } = req.body;

    // 1. Handle direct file upload to this route if present (req.file)
    if (req.file && req.file.buffer) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "placed_students", resource_type: "auto" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });
        placedPhoto = uploadResult.secure_url;
      } catch (err) {
        console.error("Cloudinary inline upload failed:", err);
      }
    }

    // 2. Auto-derive company from applications if not provided
    if (!companyName) {
      const app = await Application.findOne({ 
          student: id, 
          status: { $regex: /(offer|selected|hired|placed)/i } 
      })
      .sort({ createdAt: -1 })
      .populate({ path: "drive", populate: { path: "company" } })
      .lean();
      
      companyName = app?.drive?.company?.name || "";
    }

    // 3. Update the main Student record
    const updateData = { 
        achievementMessage, 
        isPublished: isPublished === "true" || isPublished === true,
        companyName
    };
    if (placedPhoto) updateData.placedPhoto = placedPhoto;

    const student = await Student.findByIdAndUpdate(id, updateData, { new: true });
    if (!student) return res.status(404).json({ message: "Student not found" });

    // 4. Synchronize with PlacedStudent collection (Wall of Fame)
    // 4. Synchronize with PlacedStudent collection (Wall of Fame / Draft Store)
    const populated = await Student.findById(id)
      .populate("UGbranch")
      .populate("UGinstitute")
      .populate("masters.PGbranch")
      .populate("masters.PGinstitute")
      .lean();

    const instituteId = populated.UGinstitute?._id || populated.masters?.PGinstitute?._id || null;
    const branchId = populated.UGbranch?._id || populated.masters?.PGbranch?._id || null;
    const instituteName = populated.UGinstitute?.name || (typeof populated.UGinstitute === 'string' ? populated.UGinstitute : "") || "";
    const branchName = populated.UGbranch?.name || (typeof populated.UGbranch === 'string' ? populated.UGbranch : "") || "";
    const instituteCode = populated.UGinstitute?.code || "";
    const branchCode = populated.UGbranch?.code || "";
    const passoutYear = populated.UGpassoutYear || populated.masters?.PGpassoutYear || null;

    // Also try to find drive details for the derived record
    let app;
    if (ApplicationId) {
       app = await Application.findById(ApplicationId)
          .populate({ path: "drive", populate: { path: "company" } })
          .lean();
    } else {
       app = await Application.findOne({ 
          student: id, 
          status: { $regex: /(offer|selected|hired|placed)/i } 
       })
       .sort({ createdAt: -1 })
       .populate({ path: "drive", populate: { path: "company" } })
       .lean();
    }

    const syncQuery = app?._id ? { student: id, ApplicationId: app._id } : { student: id };

    await PlacedStudent.findOneAndUpdate(
      syncQuery,
      {
        student: id,
        name: populated.name,
        enrollmentNo: populated.enrollmentNo,
        passoutYear,
        branchId,
        branchName,
        branchCode,
        instituteId,
        instituteName,
        instituteCode,
        companyId: app?.drive?.company?._id || null,
        companyName: companyName || app?.drive?.company?.name || "",
        ApplicationId: app?._id || ApplicationId || null,
        driveTitle: app?.drive?.title || "",
        jobRole: app?.roles?.[0]?.roleName || "Software Engineer",
        placedPhoto: student.placedPhoto,
        achievementMessage: student.achievementMessage,
        isPublished: student.isPublished,
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Achievement updated successfully", student });
  } catch (err) {
    console.error("updatePlacementAchievement error:", err);
    res.status(500).json({ message: "Server error updating achievement" });
  }
};