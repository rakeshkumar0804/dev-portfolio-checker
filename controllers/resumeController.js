import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { dbConnected } from "../utils/connectDatabase.js";
import { analyzeResume, buildFallbackResumeAnalysis } from "../services/resumeService.js";
import { memoryStore, persistReportsToDisk, sanitizeResumeAnalysis } from "./analyzeController.js";
import { calculateAllScores, detectMissingSkills } from "../services/scoringService.js";
import { evaluateRecruiterDecision } from "../services/recruiterEngine.js";
import { generateConsistencyMatrix } from "../services/consistencyService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel and AWS Lambda serverless functions, /var/task is read-only.
// Always use os.tmpdir() (/tmp) for uploads.
const uploadDir = path.join(os.tmpdir(), "uploads");
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn("Upload directory creation warning:", e.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (_) {}
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "resume-" + unique + ".pdf");
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) cb(null, true);
  else cb(new Error("Only PDF files are allowed"), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// POST /api/resume/analyze
export async function analyzeResumeController(req, res) {
  const file = req.file;
  const { shareId, targetRole } = req.body;

  if (!file) {
    return res.status(400).json({ message: "Please upload a PDF resume file." });
  }

  // MIME types and filenames are user-controlled; verify the PDF signature too.
  try {
    const signature = fs.readFileSync(file.path).subarray(0, 5).toString("ascii");
    if (signature !== "%PDF-") {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ message: "The uploaded file is not a valid PDF." });
    }
  } catch {
    return res.status(400).json({ message: "The uploaded PDF could not be read." });
  }

  let resumeText = "";

  try {
    const pdfParse = (await import("pdf-parse")).default;
    const dataBuffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(dataBuffer);
    resumeText = pdfData.text || "";
  } catch (pdfErr) {
    console.warn("PDF parse warning (bad XRef or encoding, applying fallback extraction):", pdfErr.message);
    try {
      const rawBuffer = fs.readFileSync(file.path);
      const rawText = rawBuffer.toString("binary");
      const textMatches = rawText.match(/\(([^()]+)\)/g);
      if (textMatches) {
        resumeText = textMatches.map((m) => m.slice(1, -1)).join(" ");
      }
    } catch (_) {
      resumeText = "";
    }
  } finally {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlink(file.path, () => {});
    }
  }

  try {
    let githubData = null;
    let existingReport = null;

    if (shareId) {
      if (memoryStore.has(shareId)) {
        existingReport = memoryStore.get(shareId);
      }
      if (!existingReport && dbConnected) {
        try {
          const { default: Report } = await import("../models/Report.js");
          existingReport = await Report.findOne({ shareId });
        } catch (e) {
          console.warn("Could not query DB for resume consistency check:", e.message);
        }
      }
      if (existingReport) {
        githubData = existingReport.githubData || null;
      }
    }

    const effectiveTargetRole = targetRole || existingReport?.targetRole || "fullstack";

    const rawResumeAnalysis = await analyzeResume(
      resumeText,
      githubData,
      effectiveTargetRole
    );
    const resumeAnalysis = sanitizeResumeAnalysis(rawResumeAnalysis);

    let updatedReport = null;

    if (shareId && existingReport) {
      const portfolioData = existingReport.portfolioData || null;

      // Re-run scoring engine with updated resume analysis
      const { scores, scoreBreakdowns, improvements, coverage } = calculateAllScores(
        githubData,
        portfolioData,
        effectiveTargetRole,
        resumeAnalysis
      );

      const skillsDetected = [
        ...(githubData?.skills || []),
        ...(resumeAnalysis?.skillsExtracted || []),
      ].filter(s => s && s !== "Unknown" && s !== "unknown");

      const missingSkills = detectMissingSkills(skillsDetected, effectiveTargetRole);
      const recruiterDecision = evaluateRecruiterDecision(
        scores,
        githubData,
        portfolioData,
        resumeAnalysis,
        effectiveTargetRole
      );
      const consistencyMatrix = generateConsistencyMatrix(githubData, resumeAnalysis);

      // Determine updated analysis mode
      const hasGithub = !!(githubData && (githubData.profile || (githubData.skills && githubData.skills.length > 0)));
      const hasPortfolio = !!(portfolioData && portfolioData.accessible);
      let analysisMode = "full_360";
      if (hasGithub && hasPortfolio) analysisMode = "full_360";
      else if (hasGithub) analysisMode = "github_resume";
      else if (hasPortfolio) analysisMode = "resume_portfolio";
      else analysisMode = "resume_only";

      const plainExisting = existingReport.toObject ? existingReport.toObject() : existingReport;

      updatedReport = {
        ...plainExisting,
        shareId,
        userId: plainExisting.userId || req.user?.id || null, // preserve ownership
        targetRole: effectiveTargetRole,
        analysisMode,
        scores,
        scoreBreakdowns,
        improvements,
        coverage: coverage || null,
        resumeAnalysis,
        skillsDetected,
        missingSkills,
        recruiterDecision,
        consistencyMatrix,
        updatedAt: Date.now(),
      };

      if (dbConnected) {
        try {
          const { default: Report } = await import("../models/Report.js");
          await Report.findOneAndUpdate({ shareId }, { ...updatedReport }, { new: true });
        } catch (e) {
          console.warn("Could not save updated report to DB:", e.message);
        }
      }

      memoryStore.set(shareId, updatedReport);

      // Evict old mode cache key and cache new mode report
      const oldCacheKey = `${updatedReport.githubUsername || ""}|${updatedReport.portfolioUrl || ""}|${plainExisting.analysisMode || ""}`;
      if (memoryStore.has(oldCacheKey)) {
        memoryStore.delete(oldCacheKey);
      }
      const newCacheKey = `${updatedReport.githubUsername || ""}|${updatedReport.portfolioUrl || ""}|${analysisMode}`;
      memoryStore.set(newCacheKey, updatedReport);

      persistReportsToDisk();
      console.log(`✅ [RESUME UPLOAD SYNC] Report ${shareId} updated with full re-scoring. Overall: ${scores.overall}, Consistency: ${consistencyMatrix?.consistencyScore}%`);
    }

    return res.json({ success: true, resumeAnalysis, report: updatedReport });
  } catch (err) {
    console.error("Resume analysis controller error:", err.message);
    const fallback = buildFallbackResumeAnalysis("", null, targetRole || "fullstack");
    return res.json({ success: true, resumeAnalysis: fallback, report: null });
  }
}
