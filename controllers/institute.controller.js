import Institute from "../models/institute.js";
import Branch from "../models/branch.js";

export const listInstitutes = async (req, res) => {
  try {
    const institutes = await Institute.find({ active: true }).select("name code").sort({ name: 1 });
    // prevent aggressive browser caching for dynamic admin data
    res.setHeader("Cache-Control", "no-store");
    res.json(institutes);
  } catch (err) {
    console.error("GET /institute error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const listBranchesForInstitute = async (req, res) => {
  try {
    // accept institute name from params or query
    const instituteName = req.params.name || req.query.instituteName;
    if (!instituteName) return res.status(400).json({ message: "Institute name is required" });

    // Find institute by name
    const inst = await Institute.findOne({ name: instituteName });
    if (!inst) return res.json([]);

    const branches = await Branch.find({ institute: inst._id, active: true }).select("name code").sort({ name: 1 });
    // prevent caching so admin UI always receives fresh branch lists
    res.setHeader("Cache-Control", "no-store");
    res.json(branches);
  } catch (err) {
    console.error("GET /institute/:name/branches error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getInstituteById = async (req, res) => {
  try {
    const { id } = req.params;
    const inst = await Institute.findById(id).select("name code").lean();
    if (!inst) return res.status(404).json({ message: "Institute not found" });
    return res.json(inst);
  } catch (err) {
    console.error("GET /institute/id/:id error", err);
    res.status(500).json({ message: "Server error" });
  }
};
