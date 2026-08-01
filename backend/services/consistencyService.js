// ═══════════════════════════════════════════════════════════════════════════════
// Resume vs GitHub Consistency Matrix Service v3 — Deep Audit & Compact Verified
// ═══════════════════════════════════════════════════════════════════════════════

export function generateConsistencyMatrix(githubData, resumeAnalysis) {
  const resumeSkills = resumeAnalysis?.skillsExtracted || [];
  const githubSkills = githubData?.skills || [];
  const topRepos = githubData?.topRepos || [];

  // Helper for skill normalization & alias matching
  function normalizeSkill(s) {
    const l = (s || "").toLowerCase().trim();
    if (l === "node" || l === "nodejs" || l === "node.js" || l === "express" || l === "expressjs") return "node";
    if (l === "react" || l === "reactjs") return "react";
    if (l === "mongo" || l === "mongodb" || l === "mongoose") return "mongodb";
    if (l === "js" || l === "javascript") return "javascript";
    if (l === "ts" || l === "typescript") return "typescript";
    if (l === "py" || l === "python") return "python";
    if (l === "rest" || l === "rest-api" || l === "restful") return "restapi";
    return l;
  }

  // Inspect all GitHub repo names & descriptions for alias matching
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

  // GitHub Only Skills (Hidden Gems missing from resume)
  const githubOnly = [];
  githubSkills.forEach((g) => {
    const norm = normalizeSkill(g);
    const inResume = resumeSkills.some((r) => normalizeSkill(r) === norm || r.toLowerCase().includes(g.toLowerCase()) || g.toLowerCase().includes(r.toLowerCase()));
    if (!inResume) {
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
