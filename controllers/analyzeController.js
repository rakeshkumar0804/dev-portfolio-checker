import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { dbConnected } from "../utils/connectDatabase.js";
import { fetchGitHubData } from "../services/githubService.js";
import { fetchPortfolioData } from "../services/portfolioService.js";
import { calculateAllScores, detectMissingSkills } from "../services/scoringService.js";
import { generateAIFeedback, buildFallbackFeedback } from "../services/aiService.js";
import { evaluateRecruiterDecision } from "../services/recruiterEngine.js";
import { generateConsistencyMatrix } from "../services/consistencyService.js";
import { consumeAnalysis } from "../services/accountService.js";
import { filterGenericTopics } from "../utils/topicFilter.js";
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

// ── Defence-in-depth: strip rawText from resumeAnalysis before persistence/response ──
// Uses an explicit allowlist so a future service regression cannot re-introduce PII exposure.
const SAFE_RESUME_FIELDS = [
  "atsScore", "atsBreakdown", "strengths", "issues", "missingKeywords",
  "hasActionVerbs", "hasMetrics", "skillsExtracted", "skillsText",
  "githubConsistency", "improvements", "overallVerdict",
  "wordCount", "quantifiedMetricsCount", "actionVerbCount", "matchedKeywords",
];

export function sanitizeResumeAnalysis(ra) {
  if (!ra || typeof ra !== "object") return ra;
  const safe = {};
  for (const key of SAFE_RESUME_FIELDS) {
    if (key in ra) safe[key] = ra[key];
  }
  return safe;
}

export function sanitizeReport(report) {
  if (!report) return report;
  if (report.resumeAnalysis) {
    report.resumeAnalysis = sanitizeResumeAnalysis(report.resumeAnalysis);
  }
  return report;
}

// ── Merge degraded GitHub data with existing high-fidelity snapshot ──────────
// When forceRefresh returns partial/scraped data, preserve known values from the
// existing report instead of replacing them with zeros or nulls.
function mergeGitHubData(fresh, existing) {
  if (!existing) return fresh;
  if (!fresh) return existing;

  const isFreshDegraded = fresh.stats?.repoFetchStatus === "unavailable" ||
    fresh.stats?.reposUnavailable === true;

  const mergedProfile = { ...fresh.profile };
  // Preserve followers/publicRepos if fresh returned null/0 but existing had real values
  if ((mergedProfile.followers === null || mergedProfile.followers === undefined) &&
      existing.profile?.followers != null && existing.profile.followers > 0) {
    mergedProfile.followers = existing.profile.followers;
  }
  if ((mergedProfile.publicRepos === null || mergedProfile.publicRepos === undefined) &&
      existing.profile?.publicRepos != null) {
    mergedProfile.publicRepos = existing.profile.publicRepos;
    mergedProfile.public_repos = existing.profile.public_repos;
  }

  const mergedStats = { ...fresh.stats };
  if (isFreshDegraded) {
    // Preserve star/fork counts from existing when fresh data is from scraper (all zeros/nulls)
    if ((mergedStats.totalStars === null || mergedStats.totalStars === 0) &&
        existing.stats?.totalStars != null && existing.stats.totalStars > 0) {
      mergedStats.totalStars = existing.stats.totalStars;
    }
    if ((mergedStats.totalForks === null || mergedStats.totalForks === 0) &&
        existing.stats?.totalForks != null && existing.stats.totalForks > 0) {
      mergedStats.totalForks = existing.stats.totalForks;
    }
    // Preserve contribution/activity data
    if ((!mergedStats.weeklyActivity || mergedStats.weeklyActivity.every(w => w.count === 0)) &&
        existing.stats?.weeklyActivity?.some(w => w.count > 0)) {
      mergedStats.weeklyActivity = existing.stats.weeklyActivity;
    }
    if (mergedStats.commitCount90Days === 0 && existing.stats?.commitCount90Days > 0) {
      mergedStats.commitCount90Days = existing.stats.commitCount90Days;
    }
    if (mergedStats.commitCount30Days === 0 && existing.stats?.commitCount30Days > 0) {
      mergedStats.commitCount30Days = existing.stats.commitCount30Days;
    }
    if (mergedStats.totalContributionsYear === 0 && existing.stats?.totalContributionsYear > 0) {
      mergedStats.totalContributionsYear = existing.stats.totalContributionsYear;
    }
    if (mergedStats.currentStreak === 0 && existing.stats?.currentStreak > 0) {
      mergedStats.currentStreak = existing.stats.currentStreak;
    }
    mergedStats.dataSource = "merged";
  }

  // Preserve topRepos star/fork counts from existing when fresh scraper zeros them out
  let mergedTopRepos = fresh.topRepos || [];
  if (isFreshDegraded && existing.topRepos?.length > 0) {
    const existingRepoMap = new Map(existing.topRepos.map(r => [r.name, r]));
    mergedTopRepos = mergedTopRepos.map(r => {
      const prev = existingRepoMap.get(r.name);
      if (prev) {
        return {
          ...r,
          stars: (r.stars === 0 && prev.stars > 0) ? prev.stars : r.stars,
          forks: (r.forks === 0 && prev.forks > 0) ? prev.forks : r.forks,
          language: r.language || prev.language,
        };
      }
      return r;
    });
  }

  // Merge skills: union of fresh and existing, filtering "Unknown"
  const mergedSkillsSet = new Set([
    ...(fresh.skills || []),
    ...(existing.skills || []),
  ]);
  mergedSkillsSet.delete("Unknown");
  mergedSkillsSet.delete("unknown");

  return {
    ...fresh,
    profile: mergedProfile,
    stats: mergedStats,
    topRepos: mergedTopRepos,
    skills: Array.from(mergedSkillsSet),
    hasProfileReadme: fresh.hasProfileReadme ?? existing.hasProfileReadme,
    languageDistribution: (fresh.languageDistribution?.length > 0)
      ? fresh.languageDistribution
      : existing.languageDistribution || [],
  };
}

// ── Filter literal "Unknown" from skills arrays ─────────────────────────────
function filterUnknownSkills(skills) {
  if (!Array.isArray(skills)) return skills;
  return skills.filter(s => s && s !== "Unknown" && s !== "unknown");
}

// POST /api/analyze/full
export async function analyzeFullProfile(req, res) {
  const requestStartTime = Date.now();
  const MAX_ANALYSIS_BUDGET_MS = 8500; // 8.5s budget to ensure completion within serverless limits

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

    let accountUsage = null;
    if (req.user?.id) {
      try {
        accountUsage = await consumeAnalysis(req.user.id);
      } catch (usageError) {
        console.warn("Could not record account analysis usage (proceeding as public analysis):", usageError.message);
        accountUsage = null;
      }
    }

    // ── Fresh analysis ───────────────────────────────────────────────────────
    console.log(`🔍 Fresh analysis [Mode: ${analysisMode}] [Role: ${targetRole}] (DB: ${dbConnected ? "✅" : "⚠️ memory-only"})`);

    // ── Run GitHub & Portfolio analyses concurrently ──────────────────────────
    const [githubResult, portfolioResult] = await Promise.allSettled([
      username ? fetchGitHubData(username) : Promise.resolve(null),
      normalizedPortfolio ? fetchPortfolioData(normalizedPortfolio) : Promise.resolve(null),
    ]);

    let githubData = null;
    let githubStatus = null;
    if (username) {
      if (githubResult.status === "fulfilled") {
        githubData = githubResult.value;
      } else {
        const err = githubResult.reason;
        const errMsg = err?.message || "Could not retrieve GitHub profile data.";
        githubStatus = err?.statusCode || (errMsg.includes("not found") ? 404 : (errMsg.includes("timeout") ? 504 : 502));
        if (analysisMode === "github_only") {
          const message = githubStatus === 504
            ? "Analysis took longer than expected. Please retry in a moment."
            : errMsg;
          return res.status(githubStatus).json({ message });
        }
        console.warn("⚠️ GitHub analysis failed in combined mode:", errMsg);
        githubData = null;
      }
    }

    let portfolioData = null;
    let portfolioStatus = null;
    if (normalizedPortfolio) {
      if (portfolioResult.status === "fulfilled") {
        portfolioData = portfolioResult.value;
        if (portfolioData && !portfolioData.accessible) {
          const fetchErr = portfolioData.fetchError || "";
          if (
            fetchErr.includes("Private or local") ||
            fetchErr.includes("Enter a valid") ||
            fetchErr.includes("Only public") ||
            fetchErr.includes("could not be resolved")
          ) {
            portfolioStatus = 400;
          } else if (fetchErr.includes("timed out") || fetchErr.includes("timeout")) {
            portfolioStatus = 504;
          } else {
            portfolioStatus = 502;
          }

          if (analysisMode === "portfolio_only") {
            const errMsg = portfolioStatus === 504
              ? "Analysis took longer than expected. Please retry in a moment."
              : (fetchErr ? `Could not access portfolio website (${fetchErr}). Please verify the URL.` : "Could not access portfolio website. Please verify the URL.");
            return res.status(portfolioStatus).json({ message: errMsg });
          }
        }
      } else {
        const err = portfolioResult.reason;
        const errMsg = err?.message || "Could not analyze portfolio website.";
        portfolioStatus = err?.statusCode || (errMsg.includes("timeout") ? 504 : 400);
        if (analysisMode === "portfolio_only") {
          const message = portfolioStatus === 504
            ? "Analysis took longer than expected. Please retry in a moment."
            : errMsg;
          return res.status(portfolioStatus).json({ message });
        }
        console.warn("⚠️ Portfolio analysis failed in combined mode:", errMsg);
        portfolioData = null;
      }
    }

    // If both requested sources failed, return a controlled stage error
    if (!githubData && (!portfolioData || !portfolioData.accessible) && !resumeAnalysis) {
      let combinedStatus = 400;
      if (githubStatus === 504 || portfolioStatus === 504) {
        return res.status(504).json({ message: "Analysis took longer than expected. Please retry in a moment." });
      }
      if (githubStatus === 502 || portfolioStatus === 502) {
        combinedStatus = 502;
      }
      return res.status(combinedStatus).json({
        message: "Unable to complete analysis. Please verify that your GitHub username and portfolio URL are publicly reachable.",
      });
    }

    // ── ForceRefresh merge: preserve high-fidelity data from existing snapshot ──
    if (isForce && githubData) {
      // Find existing report to merge with
      let existingGithubData = null;
      if (memoryStore.has(cacheKey)) {
        existingGithubData = memoryStore.get(cacheKey)?.githubData;
      }
      if (!existingGithubData) {
        // Search by shareId across all memory entries
        for (const [, stored] of memoryStore) {
          if (stored?.githubUsername === username && stored?.githubData) {
            existingGithubData = stored.githubData;
            break;
          }
        }
      }
      if (existingGithubData) {
        githubData = mergeGitHubData(githubData, existingGithubData);
        console.log(`🔀 [MERGE] Merged fresh GitHub data with existing snapshot for "${username}" (degraded: ${githubData.stats?.dataSource === "merged"})`);
      }
    }

    const { scores, scoreBreakdowns, improvements, coverage } = calculateAllScores(
      githubData,
      portfolioData,
      targetRole,
      resumeAnalysis
    );

    const skillsDetected = filterGenericTopics(
      filterUnknownSkills([
        ...(githubData?.skills || []),
        ...(resumeAnalysis?.skillsExtracted || []),
      ])
    );

    const missingSkills = detectMissingSkills(skillsDetected, targetRole);
    const recruiterDecision = evaluateRecruiterDecision(scores, githubData, portfolioData, resumeAnalysis, targetRole);
    const consistencyMatrix = generateConsistencyMatrix(githubData, resumeAnalysis);

    let aiFeedback = null;
    const elapsedBeforeAi = Date.now() - requestStartTime;
    const remainingForAi = MAX_ANALYSIS_BUDGET_MS - elapsedBeforeAi;
    if (remainingForAi >= 1500) {
      try {
        const aiDeadline = Math.min(remainingForAi - 500, 3000);
        aiFeedback = await Promise.race([
          generateAIFeedback(githubData, portfolioData, scores, improvements, targetRole, resumeAnalysis),
          new Promise((_, reject) => setTimeout(() => reject(new Error("AI feedback timeout")), aiDeadline)),
        ]);
      } catch (aiErr) {
        console.warn("AI feedback skipped or timed out (non-critical):", aiErr.message?.slice(0, 80));
      }
    } else {
      console.warn(`Skipping AI feedback to preserve serverless timeout budget (${elapsedBeforeAi}ms elapsed, ${remainingForAi}ms left)`);
    }

    // Ensure reliable, evidence-based synthesis and roadmap if AI generation timed out, failed, or was skipped
    if (!aiFeedback) {
      try {
        aiFeedback = buildFallbackFeedback(githubData, portfolioData, scores, improvements, targetRole, resumeAnalysis);
      } catch (fbErr) {
        console.warn("Fallback AI feedback error:", fbErr.message);
        aiFeedback = null;
      }
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

    // Sanitize resumeAnalysis at persistence boundary (defence-in-depth)
    const safeResumeAnalysis = sanitizeResumeAnalysis(resumeAnalysis);

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
      coverage: coverage || null,
      githubData,
      portfolioData,
      aiFeedback,
      careerRoadmap: aiFeedback?.careerRoadmap || null,
      resumeAnalysis: safeResumeAnalysis,
      skillsDetected,
      recruiterDecision,
      consistencyMatrix,
      createdAt: isForce && memoryStore.has(shareId)
        ? (memoryStore.get(shareId).createdAt || Date.now())
        : Date.now(),
      ...(isForce ? { lastRefreshedAt: Date.now() } : {}),
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
      resumeAnalysis: safeResumeAnalysis,
      scores,
      scoreBreakdowns,
      improvements,
      coverage,
      aiFeedback,
      careerRoadmap: reportPayload.careerRoadmap,
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
            analysisMode: dbReport.analysisMode,
            githubData: dbReport.githubData,
            portfolioData: dbReport.portfolioData,
            scores: dbReport.scores,
            scoreBreakdowns: dbReport.scoreBreakdowns,
            improvements: dbReport.improvements,
            coverage: dbReport.coverage || null,
            aiFeedback: dbReport.aiFeedback,
            careerRoadmap: dbReport.careerRoadmap || dbReport.aiFeedback?.careerRoadmap || null,
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

    // Defence-in-depth: strip rawText from legacy records before API response
    sanitizeReport(report);

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
