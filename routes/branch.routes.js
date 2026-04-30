import express from "express";
import { getBranchById } from "../controllers/branch.controller.js";

const router = express.Router();

router.get("/:id", getBranchById);

export default router;
