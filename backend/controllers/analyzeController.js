import { nanoid } from "nanoid";
import { dbConnected } from "../utils/connectDatabase.js";
import { fetchGitHubData } from "../services/githubService.js";
import { fetchPortfolioData } from "../services/portfolioService.js";
import { calculateAllScores, detectMissingSkills } from "../services/scoringService.js";
import { generateAIFeedback } from "../services/aiService.js";
import { evaluateRecruiterDecision } from "../services/recruiterEngine.js";
import { generateConsistencyMatrix } from "../services/consistencyService.js";

// ── In-memory fallback store (used when MongoDB is not available) ──────────────
const memoryStore = new Map(); // shareId → reportData
const lastForceRefreshMap = new Map(); // username → timestamp
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (short TTL for quick data sync)
const REFRESH_COOLDOWN_MS = 30 * 1000; // 30 seconds

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

    // ── Check in-memory cache first (skipped if forceRefresh is true) ─────────
    if (!isForce && memoryStore.has(cacheKey)) {
      const cached = memoryStore.get(cacheKey);
      if (Date.now() - cached.createdAt < CACHE_TTL_MS) {
        console.log(`♻️ Memory cache hit for key "${cacheKey}"`);
        const missingSkills = detectMissingSkills(cached.skillsDetected || [], cached.targetRole || "fullstack");
        const cacheAge = Math.round((Date.now() - cached.createdAt) / 60000);
        return res.json({ success: true, fromCache: true, cacheAge, ...cached, missingSkills });
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

    const { existingShareId } = req.body;
    let shareId = existingShareId?.trim() || null;
    if (!shareId && memoryStore.has(cacheKey)) {
      shareId = memoryStore.get(cacheKey).shareId;
    }
    if (!shareId && Report) {
      try {
        const existing = await Report.findOne({ githubUsername: username, portfolioUrl: normalizedPortfolio });
        if (existing) shareId = existing.shareId;
      } catch (_) {}
    }
    if (!shareId) shareId = nanoid(10);

    const reportPayload = {
      shareId,
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
    if (Report) {
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
    console.log(`✅ Memory report updated: ${shareId} [Mode: ${analysisMode}] — Overall: ${scores.overall}`);

    return res.json({
      success: true,
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
            createdAt: dbReport.createdAt.getTime ? dbReport.createdAt.getTime() : new Date(dbReport.createdAt).getTime(),
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
            targetRole: dbReport.targetRole || "fullstack",
          };
        }
      }
    }

    if (!report) {
      return res.status(404).json({ message: "Report not found. It may have expired — please run a new analysis." });
    }

    const username = report.githubUsername || report.githubData?.profile?.username;
    const createdAtMs = typeof report.createdAt === "number" ? report.createdAt : new Date(report.createdAt).getTime();
    const ageMs = Date.now() - createdAtMs;
    const isStale = ageMs > CACHE_TTL_MS;

    // Auto-refresh stale report (> 5 minutes old) with fresh GitHub data
    if (isStale && username) {
      try {
        console.log(`🔄 Auto-refreshing stale report (${Math.round(ageMs / 60000)}m old) for "${username}"`);
        const freshGithub = await fetchGitHubData(username);
        if (isCacheValid({ githubData: freshGithub })) {
          report.githubData = freshGithub;
          report.skillsDetected = freshGithub.skills || [];
          const { scores, scoreBreakdowns, improvements } = calculateAllScores(
            freshGithub,
            report.portfolioData,
            report.targetRole || "fullstack",
            report.resumeAnalysis || null
          );
          report.scores = scores;
          report.scoreBreakdowns = scoreBreakdowns;
          report.improvements = improvements;
          report.recruiterDecision = evaluateRecruiterDecision(
            scores,
            freshGithub,
            report.portfolioData,
            report.resumeAnalysis || null,
            report.targetRole || "fullstack"
          );
          report.consistencyMatrix = generateConsistencyMatrix(freshGithub, report.resumeAnalysis || null);
          report.createdAt = Date.now();

          // Save back to memory & DB
          if (username) {
            const cacheKey = `${username.toLowerCase()}|${report.portfolioUrl || ""}`;
            memoryStore.set(cacheKey, report);
          }
          memoryStore.set(shareId, report);

          const Report = await getReportModel();
          if (Report) {
            await Report.findOneAndUpdate(
              { shareId },
              {
                githubData: freshGithub,
                scores,
                scoreBreakdowns,
                improvements,
                skillsDetected: freshGithub.skills || [],
                createdAt: new Date(),
              }
            );
          }
        }
      } catch (refreshErr) {
        console.warn("Auto-refresh on getReport failed, serving existing data:", refreshErr.message);
      }
    }

    const missingSkills = detectMissingSkills(report.skillsDetected || [], report.targetRole || "fullstack");
    const currentAgeMs = Date.now() - (typeof report.createdAt === "number" ? report.createdAt : new Date(report.createdAt).getTime());
    const cacheAge = Math.round(currentAgeMs / 60000);

    return res.json({
      success: true,
      fromCache: currentAgeMs <= CACHE_TTL_MS,
      cacheAge,
      ...report,
      missingSkills,
    });
  } catch (err) {
    console.error("getReport error:", err);
    return res.status(500).json({ message: "Failed to fetch report: " + err.message });
  }
}
