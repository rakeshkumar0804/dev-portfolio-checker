import express from "express";
import { analyzeFullProfile, getReport } from "../controllers/analyzeController.js";
import { optionalAuth } from "../utils/auth.js";

const router = express.Router();

router.post("/full", optionalAuth, analyzeFullProfile);
router.get("/report/:shareId", getReport);

export default router;
