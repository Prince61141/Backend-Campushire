import express from "express";
import { listInstitutes, listBranchesForInstitute, getInstituteById } from "../controllers/institute.controller.js";

const router = express.Router();

// List active institutes (public)
router.get('/', listInstitutes);

// List branches for an institute (public)
router.get('/:name/branches', listBranchesForInstitute);

// Get institute by id
router.get('/id/:id', getInstituteById);

export default router;
