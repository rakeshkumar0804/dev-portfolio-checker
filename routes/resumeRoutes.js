import express from "express";
import { upload, analyzeResumeController } from "../controllers/resumeController.js";
import { optionalAuth } from "../utils/auth.js";

const router = express.Router();

router.post("/analyze", optionalAuth, (req, res, next) => {
  upload.single("resume")(req, res, (err) => {
    if (err) {
      console.warn("Resume upload middleware warning:", err.message);
      return res.status(400).json({ message: err.message || "Resume upload failed. Please select a valid PDF file under 5MB." });
    }
    next();
  });
}, analyzeResumeController);

export default router;
