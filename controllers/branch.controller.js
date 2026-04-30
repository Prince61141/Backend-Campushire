import Branch from "../models/branch.js";

export const getBranchById = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id).lean();
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    return res.json(branch);
  } catch (err) {
    console.error("GET /branch/:id error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export default { getBranchById };
