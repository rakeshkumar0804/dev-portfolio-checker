// ═══════════════════════════════════════════════════════════════════════════════
// Action Items Utility: Build Truthful, Evidence-Backed Top Priority Recommendations
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks whether a candidate action is an overlapping duplicate of an already captured action item.
 *
 * @param {Array} existingItems
 * @param {string} newTitle
 * @returns {Object|null} Matching existing item if found, null otherwise
 */
function findMatchingItem(existingItems, newTitle) {
  if (!newTitle || typeof newTitle !== "string") return null;
  const normNew = newTitle.toLowerCase().replace(/[^a-z0-9]/g, "");

  const newTokens = (newTitle.toLowerCase().match(/[a-z]{4,}/g) || []).filter(
    (w) => !["with", "your", "from", "into", "that", "this", "each", "more", "help"].includes(w)
  );

  for (const item of existingItems) {
    const existingTitle = item.action || item.title || "";
    const normExisting = existingTitle.toLowerCase().replace(/[^a-z0-9]/g, "");

    // 1. Direct or substring match
    if (normExisting === normNew || normExisting.includes(normNew) || normNew.includes(normExisting)) {
      return item;
    }

    // 2. High semantic token overlap
    const existingTokens = (existingTitle.toLowerCase().match(/[a-z]{4,}/g) || []).filter(
      (w) => !["with", "your", "from", "into", "that", "this", "each", "more", "help"].includes(w)
    );

    const intersection = newTokens.filter((t) =>
      existingTokens.some((e) => e.startsWith(t) || t.startsWith(e))
    );

    if (
      intersection.length >= 2 ||
      (intersection.length === 1 && (newTokens.length === 1 || existingTokens.length === 1))
    ) {
      return item;
    }
  }

  return null;
}

/**
 * Builds evidence-backed actionable items for the Top Priority Action Items section.
 * Reuses existing confirmed risks (recruiter red flags, collection limitations),
 * deduplicates overlapping actions, includes supporting evidence, and avoids inventing
 * arbitrary score gains (+pts) or effort estimates when uncalibrated.
 *
 * @param {Object} params
 * @returns {Array} List of actionable recommendation cards
 */
export function buildTopPriorityActionItems({
  improvements = [],
  recruiterDecision = null,
  portfolioStatus = "not_analyzed",
  portfolioData = null,
  githubStatus = "not_analyzed",
  githubData = null,
  resumeAnalysis = null,
} = {}) {
  const result = [];

  // 1. Collection limitations: Explain inspection limits truthfully without penalizing candidate
  if (portfolioStatus === "unavailable" || (portfolioData && portfolioData.accessible === false)) {
    const errorDetail = portfolioData?.errorReason || portfolioData?.scrapeError || "Connection or render timeout during inspection";
    result.push({
      action: `Portfolio inspection limited: ${portfolioData?.url ? `${portfolioData.url} (${errorDetail})` : errorDetail}`,
      why: "The portfolio URL could not be fully inspected within platform connection limits. This represents an automated collection boundary, not a candidate defect.",
      how: "Verify that the portfolio site is publicly accessible without bot protection or timeouts, or re-run analysis when the server is responsive.",
      evidence: `Inspection limitation: ${errorDetail}`,
      isUnavailable: true,
      impactLabel: "Collection Limitation",
      confidenceLevel: "Inspection Limitation",
      priority: 1,
    });
  }

  if (githubStatus === "unavailable" || (githubData && (githubData.stats?.repoFetchStatus === "unavailable" || githubData.stats?.reposUnavailable))) {
    const errorDetail = githubData?.errorReason || "GitHub API limit or timeout during repository fetch";
    result.push({
      action: `GitHub inspection limited: ${errorDetail}`,
      why: "GitHub data could not be fully fetched within API rate limits. This reflects an API boundary, not a candidate defect.",
      how: "Verify that the GitHub username is valid and public, or re-run inspection after GitHub rate limits reset.",
      evidence: `Inspection limitation: ${errorDetail}`,
      isUnavailable: true,
      impactLabel: "Collection Limitation",
      confidenceLevel: "Inspection Limitation",
      priority: 1,
    });
  }

  // 2. Evidence-backed calculated improvements from scoring
  if (Array.isArray(improvements)) {
    for (const imp of improvements) {
      if (!imp) continue;
      const title = imp.action || imp.title || "";
      if (!findMatchingItem(result, title)) {
        result.push({ ...imp });
      }
    }
  }

  // 3. Confirmed risks from Recruiter Decision Engine
  if (recruiterDecision?.redFlags && Array.isArray(recruiterDecision.redFlags)) {
    for (const flag of recruiterDecision.redFlags) {
      if (!flag) continue;
      const title = typeof flag === "string" ? flag : flag.title || flag.action || "Address Profile Gap";
      const existing = findMatchingItem(result, title);

      if (existing) {
        // Deduplicate and enrich existing item with recruiter evidence if missing
        if (!existing.evidence && typeof flag === "object" && (flag.evidence || flag.risk)) {
          existing.evidence = flag.evidence || flag.risk;
        }
      } else {
        const risk = typeof flag === "object" ? flag.risk : "";
        const evidence = typeof flag === "object" ? flag.evidence : "";
        const recommendation = typeof flag === "object" ? (flag.recommendation || flag.how) : "";

        result.push({
          action: title,
          why: risk || "Identified as a critical screening consideration by recruiter decision engine.",
          how: recommendation || risk || "Review and update this profile area to address recruiter expectations.",
          evidence: evidence || risk || "Confirmed profile gap identified during recruiter evaluation.",
          priority: 1,
          impactLabel: "Critical Hiring Risk",
          confidenceLevel: "Recruiter Engine",
          // Notice: NO points, NO difficulty, NO timeMinutes (do not invent score gains or effort estimates)
        });
      }
    }
  }

  return result.sort((a, b) => (a.priority || 4) - (b.priority || 4));
}
