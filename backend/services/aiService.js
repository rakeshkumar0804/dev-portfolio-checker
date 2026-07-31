import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];

function getGenAI() {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key || key === "your_gemini_api_key_here") return null;
  return new GoogleGenerativeAI(key);
}

async function callGemini(prompt) {
  const genAI = getGenAI();
  if (!genAI) return null;

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
        console.error("[Gemini] Invalid API key");
        return null;
      }
      if (msg.includes("429") || msg.includes("quota") || msg.includes("503")) {
        console.warn(`[Gemini] ${modelName} unavailable, trying next…`);
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      console.error(`[Gemini] Error with ${modelName}:`, msg.slice(0, 150));
      return null;
    }
  }
  return null;
}

export async function generateAIFeedback(githubData, portfolioData, scores, improvements, targetRole) {
  const { profile, stats, languageDistribution, topRepos, hasProfileReadme } = githubData;
  const langs = languageDistribution.slice(0, 5).map((l) => `${l.language} (${l.percentage}%)`).join(", ");
  const topReposList = topRepos.slice(0, 4).map((r) => `"${r.name}" (⭐${r.stars}, ${r.language || "?"})`).join(", ");

  const prompt = `You are an expert senior software engineer and tech recruiter analyzing a developer's online presence for the Developer Portfolio Health Checker app.

## Developer Data
- GitHub: @${profile.username} | ${profile.followers} followers | ${stats.ownedRepos} owned repos | ${stats.totalStars} stars | ${stats.commitCount90Days} commits/90d
- Bio: "${profile.bio || "EMPTY"}" | Website: "${profile.website || "NONE"}" | Location: "${profile.location || "NONE"}"
- Profile README: ${hasProfileReadme ? "YES" : "NO"}
- Languages: ${langs || "None"}
- Top repos: ${topReposList || "None"}
- Repos with descriptions: ${stats.reposWithDescription}/${stats.ownedRepos}
- Repos with topics: ${stats.reposWithTopics}/${stats.ownedRepos}
- Portfolio: ${portfolioData?.accessible ? `✅ ${portfolioData.url}` : "❌ None"}
- Target Role: ${targetRole || "Full Stack Developer"}

## Scores (out of 100)
- GitHub: ${scores.github}/100
- Project Quality: ${scores.projectQuality}/100
- Documentation: ${scores.documentation}/100
- Portfolio: ${scores.portfolio}/100
- Hiring Readiness: ${scores.hiringReadiness}/100
- Overall: ${scores.overall}/100

## Top Improvement Opportunities (already computed)
${improvements.slice(0, 5).map((imp, i) => `${i + 1}. ${imp.action} (+${imp.points} pts, ${imp.difficulty}, ${imp.timeMinutes}min)`).join("\n")}

---

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "overallSummary": "3-4 honest, specific sentences describing this developer's profile. Reference actual data (username, star counts, repo names). Be direct but encouraging.",
  "strengths": ["specific strength with data", "specific strength 2", "..."],
  "weaknesses": ["specific weakness with data", "specific weakness 2", "..."],
  "scoreExplanations": {
    "github": "1-2 sentences explaining WHY the GitHub score is ${scores.github}/100 with specific evidence",
    "projectQuality": "1-2 sentences explaining the project quality score",
    "documentation": "1-2 sentences explaining the documentation score",
    "portfolio": "1-2 sentences explaining the portfolio score"
  },
  "recruiterFirstImpression": {
    "verdict": "one of: Strong Candidate | Promising Developer | Needs Polish | Early Stage",
    "thought": "What a recruiter thinks in the first 10 seconds — 2 sentences, be realistic",
    "positives": ["specific thing recruiter notices positively", "..."],
    "negatives": ["specific thing recruiter notices negatively", "..."]
  },
  "careerRoadmap": {
    "currentLevel": "e.g. Junior Frontend Developer",
    "targetLevel": "e.g. Mid-Level Full Stack Developer",
    "estimatedWeeks": 4,
    "milestones": [
      { "week": "Week 1-2", "task": "specific action", "impact": "why this matters" },
      { "week": "Week 3-4", "task": "specific action", "impact": "why this matters" },
      { "week": "Week 5-6", "task": "specific action", "impact": "why this matters" }
    ]
  },
  "hiringRecommendation": "strong_hire | hire | maybe | not_yet",
  "topPriority": "The single most important thing to do right now"
}

Be specific, data-driven, and honest. Reference actual repository names, numbers, and missing things.`;

  const aiResult = await callGemini(prompt);
  if (aiResult) return aiResult;

  // Intelligent fallback (no AI required)
  return buildFallbackFeedback(githubData, portfolioData, scores, improvements, targetRole);
}

function buildFallbackFeedback(githubData, portfolioData, scores, improvements, targetRole) {
  const { profile, stats, hasProfileReadme } = githubData;
  const strengths = [];
  const weaknesses = [];

  if (stats.totalStars > 5) strengths.push(`${stats.totalStars} total stars — your work has earned community recognition`);
  if (stats.commitCount90Days > 20) strengths.push(`Active contributor: ${stats.commitCount90Days} commits in the last 90 days`);
  if (profile.bio && profile.bio.length > 10) strengths.push("GitHub bio is filled in — good first impression");
  if (hasProfileReadme) strengths.push("Profile README exists — stands out on your GitHub page");
  if (portfolioData?.accessible) strengths.push("Has a live portfolio website — shows real initiative");
  if (profile.followers > 30) strengths.push(`${profile.followers} GitHub followers — building a community presence`);
  if (stats.ownedRepos >= 5) strengths.push(`${stats.ownedRepos} public repositories — consistent project history`);
  if (languageDistributionCount(githubData) >= 3) strengths.push("Multi-language developer — versatile skillset");

  if (!profile.bio || profile.bio.length < 10) weaknesses.push("GitHub bio is empty — recruiters look here first");
  if (!hasProfileReadme) weaknesses.push("No profile README — missing a prime opportunity to make an impression");
  if (stats.commitCount90Days < 10) weaknesses.push(`Only ${stats.commitCount90Days} commits in 90 days — activity graph looks sparse`);
  if (!portfolioData?.accessible) weaknesses.push("No portfolio website — the #1 differentiator among candidates");
  if (stats.reposWithDescription < Math.ceil(stats.ownedRepos * 0.5)) weaknesses.push(`${stats.ownedRepos - stats.reposWithDescription} repos have no description — looks unpolished`);

  const level = scores.overall >= 70 ? "Mid-Level" : scores.overall >= 50 ? "Junior" : "Early-Stage";
  const verdict = scores.overall >= 70 ? "Promising Developer" : scores.overall >= 50 ? "Needs Polish" : "Early Stage";

  return {
    overallSummary: `@${profile.username} has ${stats.ownedRepos} public repositories with ${stats.totalStars} total stars and ${profile.followers} followers. ${
      stats.commitCount90Days > 15 ? "Recent activity is strong." : "Commit activity has been low recently."
    } ${scores.overall >= 60 ? "The profile shows solid foundations worth building on." : "Several quick improvements would significantly boost this profile's impact."}`,
    strengths: strengths.length ? strengths : ["Active GitHub presence with public projects"],
    weaknesses: weaknesses.length ? weaknesses : ["Profile needs more polishing"],
    scoreExplanations: {
      github: `GitHub score of ${scores.github}/100 reflects ${profile.followers} followers, ${stats.totalStars} stars, ${stats.commitCount90Days} commits in 90d, and ${Math.round((stats.reposWithDescription / Math.max(stats.ownedRepos, 1)) * 100)}% repos with descriptions.`,
      projectQuality: `Project quality at ${scores.projectQuality}/100 based on average stars, description completeness, live demos, and tech diversity across your ${stats.ownedRepos} repos.`,
      documentation: `Documentation score of ${scores.documentation}/100 — ${hasProfileReadme ? "Profile README ✓" : "no Profile README ✗"}, ${stats.reposWithDescription}/${stats.ownedRepos} repos have descriptions.`,
      portfolio: portfolioData?.accessible ? `Portfolio at ${scores.portfolio}/100 based on SEO, accessibility, mobile responsiveness, and content quality.` : "Portfolio score is 0 — no portfolio URL was provided.",
    },
    recruiterFirstImpression: {
      verdict,
      thought: `A recruiter spending 10 seconds on @${profile.username}'s profile would see ${hasProfileReadme ? "a professional README" : "no profile README"} and ${stats.ownedRepos} repositories. ${scores.hiringReadiness >= 65 ? "The profile looks reasonably prepared." : "Several gaps would make them move on quickly."}`,
      positives: strengths.slice(0, 3),
      negatives: weaknesses.slice(0, 3),
    },
    careerRoadmap: {
      currentLevel: `${level} ${targetRole === "frontend" ? "Frontend" : targetRole === "backend" ? "Backend" : "Full Stack"} Developer`,
      targetLevel: `${scores.overall >= 70 ? "Senior" : "Mid-Level"} ${targetRole === "frontend" ? "Frontend" : "Full Stack"} Developer`,
      estimatedWeeks: 4,
      milestones: improvements.slice(0, 3).map((imp, i) => ({
        week: `Week ${i * 2 + 1}–${i * 2 + 2}`,
        task: imp.action,
        impact: imp.why,
      })),
    },
    hiringRecommendation: scores.hiringReadiness >= 75 ? "hire" : scores.hiringReadiness >= 55 ? "maybe" : "not_yet",
    topPriority: improvements[0]?.action || "Complete your GitHub profile and add a portfolio website",
  };
}

function languageDistributionCount(githubData) {
  return githubData?.languageDistribution?.length || 0;
}
