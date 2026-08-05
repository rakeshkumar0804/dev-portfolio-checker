import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { dbConnected } from "../utils/connectDatabase.js";
import { fetchGitHubData } from "../services/githubService.js";
import { fetchPortfolioData } from "../services/portfolioService.js";
import { calculateAllScores, detectMissingSkills } from "../services/scoringService.js";
import { generateAIFeedback } from "../services/aiService.js";
import { evaluateRecruiterDecision } from "../services/recruiterEngine.js";
import { generateConsistencyMatrix } from "../services/consistencyService.js";
import { consumeAnalysis } from "../services/accountService.js";
import Report from "../models/Report.js";
import os from "os";

// ── In-memory & Disk fallback store (used when MongoDB is not available) ──────
export const memoryStore = new Map(); // shareId → reportData
const lastForceRefreshMap = new Map(); // username → timestamp
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (short TTL for quick data sync)
const REFRESH_COOLDOWN_MS = 30 * 1000; // 30 seconds

const STORAGE_FILE = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  ? path.join(os.tmpdir(), "saved_reports_storage.json")
  : path.join(process.cwd(), "saved_reports_storage.json");

function loadPersistedReports() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, "utf-8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        list.forEach((item) => {
          if (item && item.shareId) {
            memoryStore.set(item.shareId, item);
          }
        });
        console.log(`📦 Loaded ${memoryStore.size} persisted reports from disk.`);
      }
    }
  } catch (err) {
    console.warn("Could not load persisted reports from disk:", err.message);
  }
}

export function persistReportsToDisk() {
  try {
    const list = Array.from(memoryStore.values()).filter((item) => item && item.shareId);
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist reports to disk:", err.message);
  }
}

// Immediately load disk reports when module initializes
loadPersistedReports();

// Lazy-load Report model only when DB is connected
async function getReportModel() {
  if (!dbConnected) return null;
  const { default: Report } = await import("../models/Report.js");
  return Report;
}

function isCacheValid(report) {
  const g = report?.githubData;
  if (!g) return false;
  return (g.profile?.followers ?? 0) > 0 || (g.stats?.totalRepos ?? 0) > 0;
}

// POST /api/analyze/full
export async function analyzeFullProfile(req, res) {
  try {
    const { githubUsername, portfolioUrl, targetRole = "fullstack", forceRefresh = false, resumeAnalysis = null } = req.body;
    const isForce = forceRefresh === true || forceRefresh === "true";
    const Report = await getReportModel();

    const username = githubUsername?.trim()?.toLowerCase() || null;
    const normalizedPortfolio = portfolioUrl?.trim() || null;

    if (!username && !normalizedPortfolio && !resumeAnalysis) {
      return res.status(400).json({ message: "Please provide at least one input: GitHub username, Portfolio URL, or Resume PDF." });
    }

    // Determine Analysis Mode
    let analysisMode = "full_360";
    if (username && normalizedPortfolio && resumeAnalysis) analysisMode = "full_360";
    else if (username && normalizedPortfolio) analysisMode = "github_portfolio";
    else if (username && resumeAnalysis) analysisMode = "github_resume";
    else if (normalizedPortfolio && resumeAnalysis) analysisMode = "resume_portfolio";
    else if (username) analysisMode = "github_only";
    else if (normalizedPortfolio) analysisMode = "portfolio_only";
    else if (resumeAnalysis) analysisMode = "resume_only";

    const cacheKey = `${username || ""}|${normalizedPortfolio || ""}|${analysisMode}`;

    // Rate-limiting / debounce check for forceRefresh
    if (isForce && username) {
      const lastRefresh = lastForceRefreshMap.get(username) || 0;
      const elapsed = Date.now() - lastRefresh;
      if (elapsed < REFRESH_COOLDOWN_MS) {
        const waitSecs = Math.ceil((REFRESH_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({
          message: `Please wait ${waitSecs}s before forcing another refresh.`,
        });
      }
      lastForceRefreshMap.set(username, Date.now());
    }

    // ── Always fetch fresh live data for explicit user analysis requests ───────
    if (!isForce && memoryStore.has(cacheKey)) {
      const cached = memoryStore.get(cacheKey);
      // Only serve cache if created within the last 10 seconds
      if (Date.now() - cached.createdAt < 10 * 1000) {
        console.log(`♻️ Memory cache hit for key "${cacheKey}"`);
        const missingSkills = detectMissingSkills(cached.skillsDetected || [], cached.targetRole || "fullstack");
        const cacheAge = Math.round((Date.now() - cached.createdAt) / 1000);
        return res.json({ success: true, fromCache: true, cacheAge, ...cached, missingSkills });
      }
    }

    // Usage tracking: always optional, never blocks analysis
    let accountUsage = null;
    if (req.user?.id) {
      try {
        accountUsage = await consumeAnalysis(req.user.id);
      } catch (_) {
        // Session not found in memory/DB (e.g. cold-start wipe)
        // Silently proceed as guest — analysis is NEVER blocked
        req.user = null;
      }
    }

    // ── Fresh analysis ───────────────────────────────────────────────────────
    console.log(`🔍 Fresh analysis [Mode: ${analysisMode}] [Role: ${targetRole}] (DB: ${dbConnected ? "✅" : "⚠️ memory-only"})`);

    let githubData = null;
    if (username) {
      try {
        githubData = await fetchGitHubData(username);
      } catch (err) {
        if (analysisMode === "github_only") {
          return res.status(400).json({ message: err.message });
        }
        githubData = null;
      }
    }

    let portfolioData = null;
    if (normalizedPortfolio) {
      try {
        portfolioData = await fetchPortfolioData(normalizedPortfolio);
      } catch (_) {
        portfolioData = null;
      }
    }

    const { scores, scoreBreakdowns, improvements } = calculateAllScores(
      githubData,
      portfolioData,
      targetRole,
      resumeAnalysis
    );

    const skillsDetected = [
      ...(githubData?.skills || []),
      ...(resumeAnalysis?.skillsExtracted || []),
    ];

    const missingSkills = detectMissingSkills(skillsDetected, targetRole);
    const recruiterDecision = evaluateRecruiterDecision(scores, githubData, portfolioData, resumeAnalysis, targetRole);
    const consistencyMatrix = generateConsistencyMatrix(githubData, resumeAnalysis);

    let aiFeedback = null;
    try {
      aiFeedback = await generateAIFeedback(githubData, portfolioData, scores, improvements, targetRole, resumeAnalysis);
    } catch (aiErr) {
      console.warn("AI feedback failed (non-critical):", aiErr.message?.slice(0, 80));
    }

    // Share IDs are server-owned. Never accept a caller-provided ID because it
    // would let someone overwrite another person's report.
    let shareId = null;
    if (memoryStore.has(cacheKey)) {
      shareId = memoryStore.get(cacheKey).shareId;
    }
    if (!shareId && dbConnected) {
      try {
        const existing = await Report.findOne({ githubUsername: username, portfolioUrl: normalizedPortfolio });
        if (existing) shareId = existing.shareId;
      } catch (_) {}
    }
    if (!shareId) shareId = nanoid(10);

    const reportPayload = {
      shareId,
      userId: req.user?.id || null,
      githubUsername: username,
      portfolioUrl: normalizedPortfolio,
      targetRole,
      analysisMode,
      scores,
      scoreBreakdowns,
      improvements,
      githubData,
      portfolioData,
      aiFeedback,
      resumeAnalysis,
      skillsDetected,
      recruiterDecision,
      consistencyMatrix,
      createdAt: Date.now(),
    };

    // Save to DB if available, else memory (updating existing shareId entry)
    if (dbConnected) {
      try {
        await Report.findOneAndUpdate(
          { shareId },
          { ...reportPayload, createdAt: new Date() },
          { upsert: true, new: true }
        );
        console.log(`✅ DB report updated: ${shareId} [Mode: ${analysisMode}] — Overall: ${scores.overall}`);
      } catch (dbErr) {
        console.warn("DB save failed (non-critical), using memory:", dbErr.message?.slice(0, 80));
      }
    }
    
    memoryStore.set(cacheKey, reportPayload);
    memoryStore.set(shareId, reportPayload);
    persistReportsToDisk();
    console.log(`✅ Memory report updated & persisted to disk: ${shareId} [Mode: ${analysisMode}] — Overall: ${scores.overall}`);

    return res.json({
      success: true,
      accountUsage,
      fromCache: false,
      shareId,
      analysisMode,
      githubData,
      portfolioData,
      resumeAnalysis,
      scores,
      scoreBreakdowns,
      improvements,
      aiFeedback,
      missingSkills,
      skillsDetected,
      targetRole,
      recruiterDecision,
      consistencyMatrix,
    });
  } catch (err) {
    console.error("analyzeFullProfile error:", err);
    return res.status(500).json({ message: "Analysis failed: " + err.message });
  }
}

// GET /api/analyze/report/:shareId
export async function getReport(req, res) {
  try {
    const { shareId } = req.params;

    let report = memoryStore.get(shareId);
    let isFromDb = false;

    if (!report) {
      const Report = await getReportModel();
      if (Report) {
        const dbReport = await Report.findOne({ shareId });
        if (dbReport) {
          isFromDb = true;
          report = {
            shareId: dbReport.shareId,
            userId: dbReport.userId,
            createdAt: dbReport.createdAt?.getTime ? dbReport.createdAt.getTime() : new Date(dbReport.createdAt).getTime(),
            githubUsername: dbReport.githubUsername,
            portfolioUrl: dbReport.portfolioUrl,
            githubData: dbReport.githubData,
            portfolioData: dbReport.portfolioData,
            scores: dbReport.scores,
            scoreBreakdowns: dbReport.scoreBreakdowns,
            improvements: dbReport.improvements,
            aiFeedback: dbReport.aiFeedback,
            resumeAnalysis: dbReport.resumeAnalysis,
            skillsDetected: dbReport.skillsDetected || [],
            recruiterDecision: dbReport.recruiterDecision,
            consistencyMatrix: dbReport.consistencyMatrix,
            targetRole: dbReport.targetRole || "fullstack",
          };
        }
      }
    }

    if (!report) {
      return res.status(404).json({ message: "Report not found. It may have expired — please run a new analysis." });
    }

    const missingSkills = detectMissingSkills(report.skillsDetected || [], report.targetRole || "fullstack");
    const createdAtMs = typeof report.createdAt === "number" ? report.createdAt : new Date(report.createdAt).getTime();
    const cacheAge = Math.round((Date.now() - createdAtMs) / 60000);

    console.log(`📖 [IMMUTABLE REPORT FETCH] Loaded report ${shareId} — Stored Overall Score: ${report.scores?.overall} (From DB: ${isFromDb})`);

    return res.json({
      success: true,
      fromCache: true,
      cacheAge,
      isFromDb,
      ...report,
      missingSkills,
    });
  } catch (err) {
    console.error("getReport error:", err);
    return res.status(500).json({ message: "Failed to load report: " + err.message });
  }
}
