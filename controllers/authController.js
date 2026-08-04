import { authenticateAccount, getAccount, registerAccount } from "../services/accountService.js";
import { memoryStore, persistReportsToDisk } from "./analyzeController.js";
import { issueToken } from "../utils/auth.js";
import { dbConnected } from "../utils/connectDatabase.js";
import { getScoringTier } from "../services/scoringService.js";
import Report from "../models/Report.js";

export async function register(req, res) {
  try {
    const user = await registerAccount(req.body);
    return res.status(201).json({ user, token: issueToken(user) });
  } catch (error) { return res.status(400).json({ message: error.message }); }
}

export async function login(req, res) {
  try {
    const user = await authenticateAccount(req.body);
    return res.json({ user, token: issueToken(user) });
  } catch (error) { return res.status(401).json({ message: error.message }); }
}

export async function me(req, res) {
  const user = await getAccount(req.user.id);
  return res.json({ user });
}

export async function recentReports(req, res) {
  const userId = req.user.id;
  let reports = [];

  console.log("🔍 [BACKEND FETCH DEBUG Step 7] GET /api/auth/reports hit!", {
    authenticatedUserId: userId,
    authenticatedUserName: req.user.name,
    dbConnected,
    memoryStoreSize: memoryStore?.size || 0
  });

  if (dbConnected) {
    try {
      reports = await Report.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("shareId githubUsername portfolioUrl targetRole analysisMode scores createdAt")
        .lean();
      console.log(`🗄️ [BACKEND FETCH DEBUG Step 8a] Found ${reports.length} reports in MongoDB for userId ${userId}`);
    } catch (e) {
      console.warn("DB report fetch warning:", e.message);
    }
  }

  // Memory mode fallback or supplementary memory cache items
  if (memoryStore && memoryStore.size > 0) {
    const seen = new Set(reports.map((r) => r.shareId));
    for (const item of memoryStore.values()) {
      if (item && item.shareId && item.scores) {
        if (!seen.has(item.shareId)) {
          seen.add(item.shareId);
          reports.push({
            shareId: item.shareId,
            githubUsername: item.githubData?.profile?.username || item.githubUsername,
            portfolioUrl: item.portfolioData?.url || item.portfolioUrl,
            targetRole: item.targetRole || "fullstack",
            analysisMode: item.analysisMode || "full_360",
            scores: item.scores,
            scoreBreakdowns: item.scoreBreakdowns,
            improvements: item.improvements,
            recruiterDecision: item.recruiterDecision,
            createdAt: item.createdAt || Date.now(),
          });
        }
      }
    }
  }

  // Sort reports ascending by createdAt to calculate deltas accurately, then reverse to descending
  reports.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    const prev = i > 0 ? reports[i - 1] : null;

    if (prev && prev.scores && r.scores) {
      const overallDiff = r.scores.overall - prev.scores.overall;
      const githubDiff = (r.scores.github || 0) - (prev.scores.github || 0);
      const docDiff = (r.scores.documentation || 0) - (prev.scores.documentation || 0);
      const portDiff = (r.scores.portfolio || 0) - (prev.scores.portfolio || 0);
      const projDiff = (r.scores.projectQuality || 0) - (prev.scores.projectQuality || 0);
      const resumeDiff = (r.scores.hiringReadiness || 0) - (prev.scores.hiringReadiness || 0);

      const highlights = [];
      if (overallDiff > 0) highlights.push(`Hiring Score +${overallDiff}`);
      if (githubDiff > 0) highlights.push(`GitHub Activity +${githubDiff}`);
      if (docDiff > 0) highlights.push(`README Quality +${docDiff}`);
      if (portDiff > 0) highlights.push(`Portfolio SEO +${portDiff}`);
      if (projDiff > 0) highlights.push(`Project Code +${projDiff}`);
      if (resumeDiff > 0) highlights.push(`Resume ATS +${resumeDiff}`);

      if (overallDiff < 0) highlights.push(`Hiring Score ${overallDiff}`);
      if (highlights.length === 0) highlights.push("Baseline Maintained");

      r.deltas = {
        overallDiff,
        githubDiff,
        docDiff,
        portDiff,
        projDiff,
        resumeDiff,
        highlights
      };
    } else {
      r.deltas = {
        overallDiff: 0,
        githubDiff: 0,
        docDiff: 0,
        portDiff: 0,
        projDiff: 0,
        resumeDiff: 0,
        highlights: ["Baseline Scan Established"]
      };
    }
  }

  // Sort descending by createdAt for display
  reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  console.log(`✅ [BACKEND FETCH DEBUG STEP 5] Returning ${reports.length} reports for user ${userId} (ShareIDs: ${reports.map(r=>r.shareId).join(", ") || "none"})`);

  // Compute Career Growth Metrics
  const scoresList = reports.map((r) => r.scores?.overall).filter(Boolean);
  const latestScore = scoresList[0] || null;
  const previousScore = scoresList[1] || null;
  const bestScore = scoresList.length ? Math.max(...scoresList) : null;
  const scoreDiff = (latestScore !== null && previousScore !== null) ? (latestScore - previousScore) : null;
  const currentTier = latestScore ? getScoringTier(latestScore) : null;

  return res.json({
    reports,
    stats: {
      totalReports: reports.length,
      latestScore,
      bestScore,
      previousScore,
      scoreDiff,
      currentTier,
      lastAnalysisDate: reports[0]?.createdAt || null,
    },
  });
}

export async function saveReportToAccount(req, res) {
  try {
    const { shareId } = req.body;
    const userId = req.user.id;

    if (!shareId) return res.status(400).json({ message: "Share ID is required." });

    let targetReport = null;
    for (const [key, item] of memoryStore.entries()) {
      if (item && item.shareId === shareId) {
        targetReport = item;
        item.userId = userId;
        memoryStore.set(key, item);
      }
    }

    // Check for duplicate reports with identical scores and username created within 30 minutes
    if (targetReport) {
      for (const [key, item] of memoryStore.entries()) {
        if (
          item && item.shareId !== shareId &&
          item.userId === userId &&
          item.githubUsername === targetReport.githubUsername &&
          item.scores?.overall === targetReport.scores?.overall &&
          Math.abs(Date.now() - (item.createdAt || 0)) < 30 * 60 * 1000
        ) {
          console.log(`🔁 [DUPLICATE PREVENTION] Consolidating duplicate report snapshot ${shareId} with ${item.shareId}`);
          item.createdAt = Date.now();
          memoryStore.delete(shareId);
          persistReportsToDisk();
          return res.json({
            success: true,
            isDuplicate: true,
            message: "Report updated. Existing baseline retained to prevent duplicate snapshots.",
            shareId: item.shareId,
          });
        }
      }
    }

    persistReportsToDisk();

    if (dbConnected) {
      await Report.updateOne({ shareId }, { $set: { userId } });
    }

    return res.json({ success: true, message: "Report successfully saved to your workspace library.", shareId, userId });
  } catch (err) {
    console.error("❌ [BACKEND SAVE DEBUG Error]:", err.message);
    return res.status(500).json({ message: "Failed to save report: " + err.message });
  }
}

export async function deleteReport(req, res) {
  try {
    const { shareId } = req.params;
    const userId = req.user?.id;

    console.log(`🔍 [BACKEND DELETE DEBUG STEP 2] DELETE /api/auth/report/${shareId} hit by user ${userId}`);

    const keysToDelete = [];
    for (const [key, item] of memoryStore.entries()) {
      if (key === shareId || (item && item.shareId === shareId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => memoryStore.delete(k));
    persistReportsToDisk();

    let dbDeletedCount = 0;
    if (dbConnected) {
      const result = await Report.deleteMany({ shareId });
      dbDeletedCount = result.deletedCount || 0;
      console.log(`🗄️ [BACKEND DELETE DEBUG STEP 3] MongoDB deleteMany({ shareId: "${shareId}" }) removed ${dbDeletedCount} documents`);
    }

    console.log(`🗑️ [BACKEND DELETE DEBUG STEP 4] Successfully purged report ${shareId} (${keysToDelete.length} memory keys deleted, ${dbDeletedCount} DB docs deleted). Remaining memoryStore size: ${memoryStore.size}`);

    return res.json({
      success: true,
      message: "Report removed from your workspace library.",
      shareId,
      keysDeleted: keysToDelete.length,
      dbDocsDeleted: dbDeletedCount
    });
  } catch (err) {
    console.error("❌ [BACKEND DELETE ERROR]:", err.message);
    return res.status(500).json({ message: "Failed to delete report: " + err.message });
  }
}
