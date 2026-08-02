import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { dbConnected } from "../utils/connectDatabase.js";
import { analyzeResume, buildFallbackResumeAnalysis } from "../services/resumeService.js";

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
  destination: (req, file, cb) => cb(null, uploadDir),
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

    if (shareId && dbConnected) {
      try {
        const { default: Report } = await import("../models/Report.js");
        const report = await Report.findOne({ shareId });
        if (report) githubData = report.githubData;
      } catch (e) {
        console.warn("Could not query DB for resume consistency check:", e.message);
      }
    }

    const resumeAnalysis = await analyzeResume(
      resumeText,
      githubData,
      targetRole || "fullstack"
    );

    if (shareId && dbConnected) {
      try {
        const { default: Report } = await import("../models/Report.js");
        await Report.updateOne({ shareId }, { $set: { resumeAnalysis } });
      } catch (e) {
        console.warn("Could not save resume analysis to DB:", e.message);
      }
    }

    return res.json({ success: true, resumeAnalysis });
  } catch (err) {
    console.error("Resume analysis controller error:", err.message);
    const fallback = buildFallbackResumeAnalysis("", null, targetRole || "fullstack");
    return res.json({ success: true, resumeAnalysis: fallback });
  }
}
