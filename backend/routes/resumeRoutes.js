import express from "express";
import { upload, analyzeResumeController } from "../controllers/resumeController.js";

const router = express.Router();

router.post("/analyze", upload.single("resume"), analyzeResumeController);

export default router;
