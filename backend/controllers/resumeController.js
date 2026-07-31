import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dbConnected } from "../utils/connectDatabase.js";
import { analyzeResume } from "../services/resumeService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir =
  process.env.VERCEL === "1"
    ? "/tmp/uploads"
    : path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "resume-" + unique + ".pdf");
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") cb(null, true);
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
    return res
      .status(400)
      .json({ message: "Please upload a PDF resume" });
  }

  try {
    // Dynamically import pdf-parse
    const pdfParse = (
      await import("pdf-parse/lib/pdf-parse.js")
    ).default;
    const dataBuffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(dataBuffer);
    const resumeText = pdfData.text;

    // Clean up uploaded file
    fs.unlink(file.path, () => {});

    let githubData = null;

    if (shareId && dbConnected) {
      try {
        const { default: Report } =
          await import("../models/Report.js");
        const report = await Report.findOne({ shareId });
        if (report) githubData = report.githubData;
      } catch (e) {
        console.warn(
          "Could not query DB for resume consistency check:",
          e.message,
        );
      }
    }

    const resumeAnalysis = await analyzeResume(
      resumeText,
      githubData,
      targetRole || "fullstack",
    );

    if (shareId && dbConnected) {
      try {
        const { default: Report } =
          await import("../models/Report.js");
        await Report.updateOne(
          { shareId },
          { $set: { resumeAnalysis } },
        );
      } catch (e) {
        console.warn(
          "Could not save resume analysis to DB:",
          e.message,
        );
      }
    }

    return res.json({ success: true, resumeAnalysis });
  } catch (err) {
    if (file?.path && fs.existsSync(file.path))
      fs.unlink(file.path, () => {});
    console.error("Resume analysis error:", err.message);
    return res.status(500).json({
      message: "Failed to analyze resume: " + err.message,
    });
  }
}
