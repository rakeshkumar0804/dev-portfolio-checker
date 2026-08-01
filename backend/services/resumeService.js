import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];

function getGenAI() {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key || key === "your_gemini_api_key_here") return null;
  return new GoogleGenerativeAI(key);
}

export async function analyzeResume(resumeText, githubData, targetRole = "fullstack") {
  if (!resumeText || resumeText.trim().length < 30) {
    return buildFallbackResumeAnalysis("", githubData, targetRole);
  }

  const text = resumeText.trim();
  const lowerText = text.toLowerCase();

  // 1. Action Verbs Detection
  const actionVerbsList = [
    "built", "developed", "designed", "implemented", "engineered", "created",
    "architected", "deployed", "led", "managed", "optimized", "reduced",
    "increased", "scaled", "automated", "refactored", "integrated", "launched",
    "spearheaded", "revamped", "established", "orchestrated"
  ];
  const foundVerbs = actionVerbsList.filter((v) => new RegExp(`\\b${v}\\b`, "i").test(text));
  const hasActionVerbs = foundVerbs.length > 0;
  const actionVerbsScore = Math.min(100, Math.round((foundVerbs.length / 4) * 100));

  // 2. Quantifiable Impact Metrics Detection
  const metricRegex = /\b(\d+%\b|\d+x\b|\d+\s*(?:users|clients|ms|sec|seconds|min|hr|hrs|k|m|mil|million|billion)\b|\$\d+)/gi;
  const foundMetrics = text.match(metricRegex) || [];
  const hasMetrics = foundMetrics.length > 0;
  const impactMetricsScore = Math.min(100, Math.round((foundMetrics.length / 3) * 100));

  // 3. Formatting & Section Structure Score
  const sections = ["experience", "projects", "skills", "education", "contact", "summary"];
  const foundSections = sections.filter((s) => lowerText.includes(s));
  const formattingScore = Math.min(100, Math.round((foundSections.length / 4) * 100));

  // 4. Role-Specific Keyword Match
  const roleKeywordsMap = {
    fullstack: ["react", "node", "javascript", "typescript", "express", "mongodb", "sql", "api", "git", "css", "html"],
    frontend: ["react", "javascript", "typescript", "css", "html", "tailwind", "redux", "next", "vite", "ui", "ux"],
    backend: ["node", "express", "python", "java", "sql", "postgresql", "mongodb", "redis", "docker", "api", "rest"],
    react: ["react", "redux", "javascript", "typescript", "next", "tailwind", "context", "hooks", "css", "html"],
    node: ["node", "express", "javascript", "typescript", "mongodb", "postgresql", "redis", "jwt", "async", "api"],
    python_dev: ["python", "django", "fastapi", "flask", "sql", "postgresql", "docker", "pandas", "pytest"],
    java_dev: ["java", "spring", "boot", "hibernate", "sql", "maven", "gradle", "microservices"],
    ai_ml: ["python", "pytorch", "tensorflow", "scikit", "pandas", "numpy", "jupyter", "huggingface", "llm", "ai", "model"],
    data_science: ["python", "r", "sql", "pandas", "numpy", "scikit", "matplotlib", "seaborn", "tableau", "statistics"],
    devops: ["docker", "kubernetes", "aws", "ci/cd", "terraform", "github actions", "linux", "bash", "jenkins"],
    mobile: ["react native", "flutter", "swift", "kotlin", "firebase", "ios", "android", "mobile"],
  };

  const expectedKeywords = roleKeywordsMap[targetRole] || roleKeywordsMap[targetRole?.replace("-", "_")] || roleKeywordsMap.fullstack;
  const foundKeywords = expectedKeywords.filter((k) => lowerText.includes(k));
  const missingKeywords = expectedKeywords.filter((k) => !lowerText.includes(k));
  const keywordsScore = Math.min(100, Math.round((foundKeywords.length / Math.max(expectedKeywords.length, 1)) * 100));

  // 5. Length & Readability Score
  const wordCount = text.split(/\s+/).length;
  const lengthScore = wordCount >= 150 && wordCount <= 800 ? 90 : (wordCount > 800 ? 70 : 55);

  // Overall ATS Score calculation
  const atsScore = Math.round(
    formattingScore * 0.25 +
    keywordsScore * 0.30 +
    actionVerbsScore * 0.25 +
    impactMetricsScore * 0.20
  );

  // Skill Extraction from Resume text
  const allKnownSkills = [
    "React", "Node.js", "Express", "MongoDB", "PostgreSQL", "JavaScript", "TypeScript",
    "Python", "Java", "C++", "HTML", "CSS", "Tailwind", "Docker", "Kubernetes", "AWS",
    "SQL", "Git", "REST API", "GraphQL", "Redux", "Next.js", "Vue", "Angular", "PyTorch",
    "TensorFlow", "Pandas", "NumPy", "Jupyter", "FastAPI", "Django", "Spring Boot", "Firebase"
  ];
  const skillsExtracted = allKnownSkills.filter((s) => lowerText.includes(s.toLowerCase()));

  // Strengths & Weaknesses generator
  const strengths = [];
  if (foundVerbs.length >= 2) strengths.push(`Strong use of action verbs (${foundVerbs.slice(0, 4).join(", ")})`);
  if (hasMetrics) strengths.push(`Includes quantifiable metrics (${foundMetrics.slice(0, 2).join(", ")})`);
  if (foundKeywords.length >= 3) strengths.push(`Matches target role skills (${foundKeywords.slice(0, 5).join(", ")})`);
  if (foundSections.length >= 3) strengths.push("Well-structured section headers (Experience, Projects, Skills)");

  const issues = [];
  if (!hasMetrics) issues.push("Missing quantifiable impact metrics (e.g., 'Reduced load time by 35%', 'Served 10k users')");
  if (foundVerbs.length < 2) issues.push("Lacks strong action verbs at the start of bullet points");
  if (missingKeywords.length > 0) issues.push(`Missing target role keywords: ${missingKeywords.slice(0, 4).join(", ")}`);
  if (wordCount < 150) issues.push("Resume text is short — add more project impact details");

  // Gemini AI qualitative verdict call if key present
  let aiVerdict = null;
  try {
    const genAI = getGenAI();
    if (genAI) {
      const prompt = `You are a Senior Tech Recruiter reviewing a developer's resume for a ${targetRole} role.
Resume Text: "${text.slice(0, 2500)}"
Target Role: ${targetRole}
Found Skills: ${skillsExtracted.join(", ")}
Found Metrics: ${foundMetrics.join(", ")}

Return ONLY valid JSON (no markdown):
{
  "overallVerdict": "2 sentence executive recruiter summary of resume quality for ${targetRole} hiring.",
  "strengths": ["recruiter strength 1", "recruiter strength 2"],
  "issues": ["recruiter concern 1", "recruiter concern 2"]
}`;
      for (const modelName of MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const res = await model.generateContent(prompt);
          const raw = res.response.text();
          const json = raw.match(/\{[\s\S]*\}/);
          if (json) {
            aiVerdict = JSON.parse(json[0]);
            break;
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  const finalStrengths = aiVerdict?.strengths?.length > 0 ? aiVerdict.strengths : (strengths.length > 0 ? strengths : ["Resume provided and parsed successfully"]);
  const finalIssues = aiVerdict?.issues?.length > 0 ? aiVerdict.issues : (issues.length > 0 ? issues : ["Add quantifiable impact metrics to demonstrate business results"]);

  const githubSkills = githubData?.skills || [];
  const matchingConsistency = skillsExtracted.filter((s) => githubSkills.some((g) => g.toLowerCase() === s.toLowerCase()));
  const onlyResume = skillsExtracted.filter((s) => !matchingConsistency.includes(s));
  const onlyGithub = githubSkills.filter((g) => !skillsExtracted.some((s) => s.toLowerCase() === g.toLowerCase()));

  return {
    atsScore: Math.max(atsScore, 55),
    atsBreakdown: {
      formatting: Math.max(formattingScore, 65),
      keywords: Math.max(keywordsScore, 50),
      actionVerbs: Math.max(actionVerbsScore, 40),
      impactMetrics: Math.max(impactMetricsScore, 30),
      length: lengthScore,
    },
    strengths: finalStrengths,
    issues: finalIssues,
    missingKeywords,
    hasActionVerbs,
    hasMetrics,
    skillsExtracted,
    githubConsistency: {
      score: matchingConsistency.length > 0 ? Math.round((matchingConsistency.length / Math.max(skillsExtracted.length, 1)) * 100) : 70,
      matching: matchingConsistency,
      onlyResume,
      onlyGithub,
    },
    improvements: finalIssues.map((issue, idx) => ({
      action: issue,
      impact: "Boosts ATS keyword ranking and recruiter interview rate",
      priority: idx + 1,
    })),
    overallVerdict: aiVerdict?.overallVerdict || `Resume scored ${Math.max(atsScore, 55)}/100 for ${targetRole.toUpperCase()} role. Extracted skills: ${skillsExtracted.slice(0, 5).join(", ") || "Technical skills"}. Add quantified impact metrics to increase interview calls.`,
  };
}

export function buildFallbackResumeAnalysis(resumeText, githubData, targetRole) {
  return {
    atsScore: 0,
    atsBreakdown: { formatting: 0, keywords: 0, actionVerbs: 0, impactMetrics: 0, length: 0 },
    strengths: ["No resume uploaded"],
    issues: ["Upload a PDF resume to analyze ATS keyword match and formatting"],
    missingKeywords: [],
    hasActionVerbs: false,
    hasMetrics: false,
    skillsExtracted: [],
    githubConsistency: { score: 0, matching: [], onlyResume: [], onlyGithub: [] },
    improvements: [],
    overallVerdict: "Upload your PDF resume to receive ATS scoring, keyword matching, and recruiter insights.",
  };
}
