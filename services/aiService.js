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

export async function generateAIFeedback(githubData, portfolioData, scores, improvements, targetRole, resumeAnalysis) {
  const profile = githubData?.profile || {};
  const stats = githubData?.stats || {};
  const languageDistribution = githubData?.languageDistribution || [];
  const topRepos = githubData?.topRepos || [];
  const hasProfileReadme = githubData?.hasProfileReadme || false;

  const langs = languageDistribution.slice(0, 5).map((l) => `${l.language} (${l.percentage}%)`).join(", ");
  const topReposList = topRepos.slice(0, 4).map((r) => `"${r.name}" (⭐${r.stars}, ${r.language || "?"})`).join(", ");

  const resumeScore = resumeAnalysis?.atsScore || 0;
  const resumeSkills = (resumeAnalysis?.skillsExtracted || []).join(", ") || "None";
  const resumeStrengths = (resumeAnalysis?.strengths || []).join("; ") || "None";
  const resumeIssues = (resumeAnalysis?.issues || []).join("; ") || "None";

  const prompt = `You are an expert senior tech recruiter analyzing a developer's profile for the Developer Portfolio Health Checker app.

## Developer Input Data
- GitHub: ${profile.username ? `@${profile.username}` : "Not Provided"} | ${profile.followers || 0} followers | ${stats.ownedRepos || 0} repos | ${stats.totalStars || 0} stars
- Bio: "${profile.bio || "NONE"}" | Website: "${profile.website || "NONE"}"
- Profile README: ${hasProfileReadme ? "YES" : "NO"}
- Languages: ${langs || "None"}
- Top Repos: ${topReposList || "None"}
- Portfolio: ${portfolioData?.accessible ? `✅ ${portfolioData.url}` : "❌ None"}
- Resume ATS Score: ${resumeScore > 0 ? `${resumeScore}/100` : "❌ None"}
- Resume Extracted Skills: ${resumeSkills}
- Resume Strengths: ${resumeStrengths}
- Resume Concerns: ${resumeIssues}
- Target Role: ${targetRole || "Full Stack Developer"}

## Scores (out of 100)
- Overall: ${scores.overall}/100
- Hiring Readiness: ${scores.hiringReadiness}/100
- GitHub: ${scores.github}/100
- Portfolio: ${scores.portfolio}/100

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "overallSummary": "3-4 honest, specific sentences evaluating this candidate for ${targetRole}. Reference actual resume skills, GitHub data, or portfolio if present.",
  "strengths": ["specific candidate strength 1", "specific candidate strength 2"],
  "weaknesses": ["specific candidate weakness 1", "specific candidate weakness 2"],
  "scoreExplanations": {
    "github": "Explanation of GitHub score",
    "projectQuality": "Explanation of project quality score",
    "documentation": "Explanation of documentation score",
    "portfolio": "Explanation of portfolio score"
  },
  "recruiterFirstImpression": {
    "verdict": "one of: Strong Candidate | Promising Developer | Needs Polish | Early Stage",
    "thought": "What a recruiter thinks in the first 10 seconds scanning this candidate for ${targetRole}",
    "positives": ["specific positive signal"],
    "negatives": ["specific concern or red flag"]
  },
  "careerRoadmap": {
    "currentLevel": "Candidate Level",
    "targetLevel": "Target Level",
    "estimatedWeeks": 4,
    "milestones": [
      { "week": "Week 1-2", "task": "actionable task", "impact": "why it matters" },
      { "week": "Week 3-4", "task": "actionable task", "impact": "why it matters" }
    ]
  },
  "hiringRecommendation": "strong_hire | hire | maybe | not_yet",
  "topPriority": "The single most important improvement right now"
}`;

  const aiResult = await callGemini(prompt);
  if (aiResult) return aiResult;

  return buildFallbackFeedback(githubData, portfolioData, scores, improvements, targetRole, resumeAnalysis);
}

function buildFallbackFeedback(githubData, portfolioData, scores, improvements, targetRole, resumeAnalysis) {
  const profile = githubData?.profile || {};
  const stats = githubData?.stats || {};
  const strengths = [];
  const weaknesses = [];

  const hasGithub = !!(githubData && githubData.profile);
  const hasPortfolio = !!(portfolioData && portfolioData.accessible);
  const hasResume = !!(resumeAnalysis && resumeAnalysis.atsScore);

  if (hasResume) {
    if (resumeAnalysis.atsScore >= 70) strengths.push(`Strong Resume ATS score of ${resumeAnalysis.atsScore}/100`);
    if (resumeAnalysis.hasActionVerbs) strengths.push("Resume uses active verbs in work experience");
    if (resumeAnalysis.hasMetrics) strengths.push("Resume includes quantified impact metrics");
    if (resumeAnalysis.skillsExtracted?.length > 0) strengths.push(`Resume demonstrates skills in: ${resumeAnalysis.skillsExtracted.slice(0, 5).join(", ")}`);

    if (!resumeAnalysis.hasMetrics) weaknesses.push("Resume lacks quantitative achievements (e.g. 'improved performance by 30%')");
    if (!resumeAnalysis.hasActionVerbs) weaknesses.push("Resume bullet points need stronger action verbs");
    if (resumeAnalysis.missingKeywords?.length > 0) weaknesses.push(`Missing keywords for ${targetRole.toUpperCase()}: ${resumeAnalysis.missingKeywords.slice(0, 3).join(", ")}`);
  }

  if (hasGithub) {
    if (stats.totalStars > 5) strengths.push(`${stats.totalStars} total GitHub stars`);
    if (stats.commitCount90Days > 20) strengths.push(`Active GitHub activity: ${stats.commitCount90Days} commits in 90 days`);
    if (!profile.bio || profile.bio.length < 10) weaknesses.push("GitHub bio is empty");
  } else if (!hasResume) {
    weaknesses.push("No GitHub profile provided");
  }

  if (hasPortfolio) {
    strengths.push("Live portfolio website available");
  } else if (!hasResume) {
    weaknesses.push("No portfolio website provided");
  }

  const level = scores.overall >= 75 ? "Mid-Level" : scores.overall >= 55 ? "Junior" : "Early-Stage";
  const verdict = scores.overall >= 75 ? "Promising Developer" : scores.overall >= 55 ? "Needs Polish" : "Early Stage";

  return {
    overallSummary: `Analysis completed for ${targetRole.toUpperCase()} role. ${
      hasResume ? `Resume scored ${resumeAnalysis.atsScore}/100 with extracted skills (${(resumeAnalysis.skillsExtracted || []).slice(0, 5).join(", ") || "general"}).` : ""
    } ${hasGithub ? `@${profile.username} has ${stats.ownedRepos || 0} repos.` : ""} Focus on strengthening quantifiable achievements to maximize interview call rates.`,
    strengths: strengths.length ? strengths : ["Candidate profile provided for evaluation"],
    weaknesses: weaknesses.length ? weaknesses : ["Add more quantifiable project impact metrics"],
    scoreExplanations: {
      github: hasGithub ? `GitHub score of ${scores.github}/100 reflects commits and public repos.` : "GitHub analysis skipped.",
      projectQuality: hasGithub ? `Project quality at ${scores.projectQuality}/100 based on repository completeness.` : "Project quality skipped.",
      documentation: hasGithub ? `Documentation score of ${scores.documentation}/100.` : "Documentation analysis skipped.",
      portfolio: hasPortfolio ? `Portfolio at ${scores.portfolio}/100.` : "Portfolio analysis skipped.",
    },
    recruiterFirstImpression: {
      verdict,
      thought: `A recruiter evaluating this ${targetRole.toUpperCase()} application sees ${hasResume ? `a resume with ATS score ${resumeAnalysis.atsScore}/100` : "an incomplete profile"}. ${scores.overall >= 65 ? "The candidate looks worth interviewing." : "More evidence of project impact is needed."}`,
      positives: strengths.slice(0, 3),
      negatives: weaknesses.slice(0, 3),
    },
    careerRoadmap: {
      currentLevel: `${level} ${targetRole.toUpperCase()} Candidate`,
      targetLevel: `Mid/Senior ${targetRole.toUpperCase()} Developer`,
      estimatedWeeks: 4,
      milestones: [
        { week: "Week 1–2", task: "Add quantifiable metrics to resume and top project READMEs", impact: "Directly improves ATS score and recruiter callback rate" },
        { week: "Week 3–4", task: "Build a production demo project aligned with " + targetRole.toUpperCase(), impact: "Provides strong technical proof to interviewers" }
      ],
    },
    hiringRecommendation: scores.overall >= 75 ? "hire" : scores.overall >= 55 ? "maybe" : "not_yet",
    topPriority: improvements[0]?.action || "Add quantified achievements and action verbs to resume bullet points",
  };
}
