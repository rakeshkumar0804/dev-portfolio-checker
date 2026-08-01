// ═══════════════════════════════════════════════════════════════════════════════
// Resume vs GitHub Consistency Matrix Service v4 — Robust Alias & Text Matching
// ═══════════════════════════════════════════════════════════════════════════════

export function generateConsistencyMatrix(githubData, resumeAnalysis) {
  const resumeSkills = resumeAnalysis?.skillsExtracted || [];
  const resumeRawText = (resumeAnalysis?.rawText || "").toLowerCase();
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
        evidenceMissing: "No matching public GitHub code found",
        actionableFix: `Build a small public demo project using ${skill}`,
        impact: "Medium",
      });
    }
  });

  // GitHub Only Skills (Filtered out if found in resume text or skills)
  const githubOnly = [];
  githubSkills.forEach((g) => {
    const normG = normalizeSkill(g);
    const rawG = g.toLowerCase().replace(/[^a-z0-9]/g, "");

    const inResumeSkills = resumeSkills.some((r) => {
      const normR = normalizeSkill(r);
      const rawR = r.toLowerCase().replace(/[^a-z0-9]/g, "");
      return normR === normG || rawR === rawG || rawR.includes(rawG) || rawG.includes(rawR);
    });

    const inResumeText = resumeRawText.length > 0 && (resumeRawText.includes(g.toLowerCase()) || (rawG.length > 2 && resumeRawText.includes(rawG)));

    if (!inResumeSkills && !inResumeText) {
      githubOnly.push(g);
      actionAuditList.push({
        skill: g,
        status: "GitHub Only (Hidden Gem)",
        evidenceFound: "Active code found in public GitHub repos",
        evidenceMissing: "Missing from uploaded resume PDF",
        actionableFix: `Add ${g} to your resume skills section`,
        impact: "High",
      });
    }
  });

  // Consistency Score Calculation
  let consistencyScore = 100;
  if (resumeSkills.length > 0) {
    const ratio = verifiedInBoth.length / resumeSkills.length;
    consistencyScore = Math.min(100, Math.max(35, Math.round(ratio * 100)));
  }

  // Warnings Rationale
  const warnings = [];
  if (resumeOnly.length > 2) {
    warnings.push(`Resume claims ${resumeOnly.length} skills (${resumeOnly.slice(0, 3).join(", ")}) that have no public GitHub code proof.`);
  }
  if (githubOnly.length > 0) {
    warnings.push(`You have active GitHub code in ${githubOnly.slice(0, 3).join(", ")}, but these are missing from your resume!`);
  }

  return {
    consistencyScore,
    verifiedInBoth: [...new Set(verifiedInBoth)],
    resumeOnly: [...new Set(resumeOnly)],
    githubOnly: [...new Set(githubOnly)].slice(0, 8),
    actionAuditList: actionAuditList.slice(0, 10),
    warnings,
  };
}
