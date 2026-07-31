import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

function getGenAI() {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key || key === "your_gemini_api_key_here") return null;
  return new GoogleGenerativeAI(key);
}

export async function analyzeResume(resumeText, githubData, targetRole) {
  if (!resumeText || resumeText.trim().length < 100) {
    return buildFallbackResumeAnalysis(null, githubData, targetRole);
  }

  const detectedSkills = githubData?.skills || [];
  const prompt = `You are an expert ATS (Applicant Tracking System) and resume review specialist analyzing a developer's resume.

## Resume Content:
${resumeText.slice(0, 4000)}

## Context:
- Target Role: ${targetRole || "Full Stack Developer"}
- GitHub Detected Skills: ${detectedSkills.join(", ") || "None"}

Return ONLY a valid JSON (no markdown):
{
  "atsScore": 72,
  "atsBreakdown": {
    "formatting": 85,
    "keywords": 70,
    "actionVerbs": 65,
    "impactMetrics": 55,
    "length": 80
  },
  "strengths": ["specific resume strength 1", "strength 2"],
  "issues": ["specific issue 1", "issue 2"],
  "missingKeywords": ["keyword relevant to ${targetRole} missing from resume"],
  "hasActionVerbs": true,
  "hasMetrics": false,
  "githubConsistency": {
    "score": 75,
    "matching": ["skill that appears in both resume and github"],
    "onlyResume": ["skill claimed in resume but not in github repos"],
    "onlyGithub": ["skill in github but not mentioned in resume"]
  },
  "improvements": [
    { "action": "specific improvement", "impact": "why it matters for ATS", "priority": 1 }
  ],
  "overallVerdict": "2 sentence assessment"
}`;

  const genAI = getGenAI();
  if (!genAI) return buildFallbackResumeAnalysis(resumeText, githubData, targetRole);

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.warn(`[Resume AI] ${modelName} failed:`, err.message?.slice(0, 100));
      continue;
    }
  }

  return buildFallbackResumeAnalysis(resumeText, githubData, targetRole);
}

function buildFallbackResumeAnalysis(resumeText, githubData, targetRole) {
  const text = (resumeText || "").toLowerCase();
  const skills = githubData?.skills || [];

  const hasActionVerbs = /\b(built|developed|designed|implemented|led|managed|optimized|created|launched|deployed|architected)\b/.test(text);
  const hasMetrics = /\b(\d+%|\d+x|\d+ users|\$\d+|improved|increased|reduced|decreased)\b/.test(text);

  return {
    atsScore: resumeText ? 60 : 0,
    atsBreakdown: {
      formatting: 70,
      keywords: resumeText ? 60 : 0,
      actionVerbs: hasActionVerbs ? 75 : 40,
      impactMetrics: hasMetrics ? 70 : 30,
      length: 75,
    },
    strengths: resumeText ? ["Resume was provided for analysis"] : ["No resume uploaded"],
    issues: [
      ...(!hasMetrics ? ["Add quantifiable impact metrics (e.g., '30% faster', '10k users')"] : []),
      ...(!hasActionVerbs ? ["Use strong action verbs: Built, Developed, Designed, Implemented"] : []),
    ],
    missingKeywords: [],
    hasActionVerbs,
    hasMetrics,
    githubConsistency: {
      score: 70,
      matching: skills.slice(0, 5),
      onlyResume: [],
      onlyGithub: skills.slice(5, 10),
    },
    improvements: [
      { action: "Add measurable impact to each bullet point", impact: "ATS systems and recruiters prioritize quantified achievements", priority: 1 },
      { action: "Use strong action verbs at the start of each bullet", impact: "Makes resume more dynamic and professional", priority: 2 },
    ],
    overallVerdict: resumeText
      ? "Resume has been analyzed. Focus on adding quantifiable achievements and strong action verbs to improve ATS ranking."
      : "No resume was uploaded. Upload your PDF resume for ATS analysis and personalized feedback.",
  };
}
