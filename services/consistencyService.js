// ═══════════════════════════════════════════════════════════════════════════════
// Resume vs GitHub Consistency Matrix Service v4 — Robust Alias & Text Matching
// ═══════════════════════════════════════════════════════════════════════════════

export function generateConsistencyMatrix(githubData, resumeAnalysis) {
  const resumeSkills = resumeAnalysis?.skillsExtracted || [];
  const resumeSkillsText = (resumeAnalysis?.skillsText || "").toLowerCase();
  const githubSkills = githubData?.skills || [];
  const topRepos = githubData?.topRepos || [];

  // Robust skill normalization & alias matching
  function normalizeSkill(s) {
    const l = (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    if (l === "node" || l === "nodejs") return "node";
    if (l === "express" || l === "expressjs") return "express";
    if (l === "react" || l === "reactjs") return "react";
    if (l === "mongo" || l === "mongodb" || l === "mongoose") return "mongodb";
    if (l === "js" || l === "javascript" || l === "javascriptes6") return "javascript";
    if (l === "ts" || l === "typescript") return "typescript";
    if (l === "py" || l === "python") return "python";
    if (l === "fullstack" || l === "fullstackdeveloper") return "fullstack";
    if (l === "rest" || l === "restapi" || l === "restful") return "restapi";
    if (l === "developertools") return "developertools";
    if (l === "careerdevelopment") return "careerdevelopment";
    if (l === "ats") return "ats";
    if (l === "ai") return "ai";
    return l;
  }

  // Generic non-technical metadata topics that must not become skill recommendations
  const GENERIC_PROJECT_TOPICS = new Set([
    "resume", "portfolio", "ats", "developer-tools", "developertools",
    "project", "projects", "sample", "demo", "demos", "assignment", "assignments",
    "homework", "practice", "personal-website", "portfolio-website", "website",
    "web-application", "web-app", "app", "application", "challenge", "tutorial",
    "tutorials", "learning", "starter", "starter-kit", "boilerplate", "template",
    "hackathon", "career", "career-development", "careerdevelopment", "github",
    "showcase", "showcases", "docs", "documentation", "guide", "collection",
    "exercises", "notes", "resources", "resource", "interview", "interview-prep",
    "test", "testing-ground", "sandbox", "example", "examples", "student",
    "beginner", "free", "open-source", "opensource", "frontend-mentor",
    "coding-challenge", "mini-project", "coursework"
  ]);

  // Inspect all GitHub repo names, descriptions, and topics
  const repoTexts = topRepos.map((r) => `${r.name || ""} ${r.description || ""} ${(r.topics || []).join(" ")} ${r.language || ""}`.toLowerCase());

  const verifiedInBoth = [];
  const resumeOnly = [];
  const actionAuditList = [];

  resumeSkills.forEach((skill) => {
    const norm = normalizeSkill(skill);
    const hasInGithubSkills = githubSkills.some((g) => normalizeSkill(g) === norm || g.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(g.toLowerCase()));
    const hasInRepoTexts = repoTexts.some((txt) => txt.includes(norm) || txt.includes(skill.toLowerCase()));

    if (hasInGithubSkills || hasInRepoTexts) {
      verifiedInBoth.push(skill);
    } else {
      resumeOnly.push(skill);
      actionAuditList.push({
        skill,
        status: "Resume Only (Unverified)",
        evidenceFound: "Claimed in resume text",
        evidenceMissing: "Not detected in inspected GitHub evidence",
        actionableFix: `Build a small project or add public evidence for ${skill}`,
        impact: "Medium",
      });
    }
  });

  // GitHub Only Skills (Filtered out if found in resume text or skills)
  const githubOnly = [];
  githubSkills.forEach((g) => {
    const normG = normalizeSkill(g);
    const rawG = g.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Ignore generic non-technical topics from being recommended as resume skills
    if (GENERIC_PROJECT_TOPICS.has(normG) || GENERIC_PROJECT_TOPICS.has(rawG) || GENERIC_PROJECT_TOPICS.has(g.toLowerCase())) {
      return;
    }

    const inResumeSkills = resumeSkills.some((r) => {
      const normR = normalizeSkill(r);
      const rawR = r.toLowerCase().replace(/[^a-z0-9]/g, "");
      return normR === normG || rawR === rawG || rawR.includes(rawG) || rawG.includes(rawR);
    });

    const inResumeText = resumeSkillsText.length > 0 && (resumeSkillsText.includes(g.toLowerCase()) || (rawG.length > 2 && resumeSkillsText.includes(rawG)));

    if (!inResumeSkills && !inResumeText) {
      githubOnly.push(g);
      actionAuditList.push({
        skill: g,
        status: "GitHub Only (Hidden Gem)",
        evidenceFound: "Detected in inspected GitHub repository evidence",
        evidenceMissing: "Missing from uploaded resume PDF",
        actionableFix: `Consider adding ${g} to your resume skills if proficient`,
        impact: "High",
      });
    }
  });

  const hasResume = !!(resumeAnalysis && (resumeSkills.length > 0 || resumeSkillsText.length > 0));
  if (!hasResume || resumeSkills.length === 0) {
    return {
      consistencyScore: null,
      status: !resumeAnalysis ? "not_analyzed" : "insufficient_evidence",
      verifiedInBoth: [],
      resumeOnly: [],
      githubOnly: [],
      actionAuditList: [],
      warnings: [],
    };
  }

  // Consistency Score Calculation
  let consistencyScore = null;
  if (resumeSkills.length > 0) {
    const ratio = verifiedInBoth.length / resumeSkills.length;
    consistencyScore = Math.min(100, Math.max(35, Math.round(ratio * 100)));
  }

  // Warnings Rationale
  const warnings = [];
  if (resumeOnly.length > 2) {
    warnings.push(`Resume claims ${resumeOnly.length} skills (${resumeOnly.slice(0, 3).join(", ")}) that were not detected in inspected GitHub evidence.`);
  }
  if (githubOnly.length > 0) {
    warnings.push(`Inspected GitHub evidence includes ${githubOnly.slice(0, 3).join(", ")}, but these are not listed in your resume skills.`);
  }

  return {
    consistencyScore,
    status: "analyzed",
    verifiedInBoth: [...new Set(verifiedInBoth)],
    resumeOnly: [...new Set(resumeOnly)],
    githubOnly: [...new Set(githubOnly)].slice(0, 8),
    actionAuditList: actionAuditList.slice(0, 10),
    warnings,
  };
}
