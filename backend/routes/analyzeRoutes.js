import express from "express";
import { analyzeFullProfile, getReport } from "../controllers/analyzeController.js";

const router = express.Router();

router.post("/full", analyzeFullProfile);
router.get("/report/:shareId", getReport);

export default router;
