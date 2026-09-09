import { isGenericProjectOrDomainTag, normalizeSkillAlias } from "../utils/topicFilter.js";

export function generateConsistencyMatrix(githubData, resumeAnalysis) {
  const resumeSkills = (resumeAnalysis?.skillsExtracted || []).map((s) => normalizeSkillAlias(s));
  const resumeSkillsText = (resumeAnalysis?.skillsText || "").toLowerCase();
  const githubSkills = (githubData?.skills || []).map((s) => normalizeSkillAlias(s));
  const topRepos = githubData?.topRepos || [];

  // Robust skill normalization & alias matching
  function normalizeSkill(s) {
    const canonical = normalizeSkillAlias(s);
    const l = (canonical || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    if (l === "node" || l === "nodejs") return "node";
    if (l === "express" || l === "expressjs") return "express";
    if (l === "react" || l === "reactjs") return "react";
    if (l === "mongo" || l === "mongodb" || l === "mongoose") return "mongodb";
    if (l === "js" || l === "javascript" || l === "javascriptes6") return "javascript";
    if (l === "ts" || l === "typescript") return "typescript";
    if (l === "py" || l === "python") return "python";
    if (l === "d3" || l === "d3js" || l === "d3.js") return "d3.js";
    if (l === "fullstack" || l === "fullstackdeveloper") return "fullstack";
    if (l === "rest" || l === "restapi" || l === "restful") return "restapi";
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
        status: "Resume Only (Not detected in inspected GitHub evidence)",
        evidenceFound: "Claimed in resume text",
        evidenceMissing: "Not detected in inspected GitHub evidence (scope: public repos, topics, language metadata)",
        actionableFix: `If ${skill} is a core competency, consider publishing repository evidence or highlighting it in project READMEs`,
        impact: "Medium",
      });
    }
  });

  // GitHub Only Skills (Filtered out if found in resume text or skills)
  const githubOnly = [];
  githubSkills.forEach((g) => {
    const canonicalG = normalizeSkillAlias(g);
    const normG = normalizeSkill(canonicalG);
    const rawG = canonicalG.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Ignore generic non-technical topics, project types, and domain tags from being recommended as resume skills
    if (isGenericProjectOrDomainTag(g) || isGenericProjectOrDomainTag(canonicalG) || isGenericProjectOrDomainTag(normG) || isGenericProjectOrDomainTag(rawG)) {
      return;
    }

    const inResumeSkills = resumeSkills.some((r) => {
      const normR = normalizeSkill(r);
      const rawR = r.toLowerCase().replace(/[^a-z0-9]/g, "");
      return normR === normG || rawR === rawG || rawR.includes(rawG) || rawG.includes(rawR);
    });

    const inResumeText = resumeSkillsText.length > 0 && (resumeSkillsText.includes(canonicalG.toLowerCase()) || (rawG.length > 2 && resumeSkillsText.includes(rawG)));

    if (!inResumeSkills && !inResumeText) {
      githubOnly.push(canonicalG);
      actionAuditList.push({
        skill: canonicalG,
        status: "Detected in inspected GitHub evidence",
        evidenceFound: "Detected in inspected GitHub evidence (repo metadata & topics)",
        evidenceMissing: "Not listed in uploaded resume skills",
        actionableFix: `Consider adding ${canonicalG} to your resume skills if proficient`,
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
    warnings.push(`Resume claims ${resumeOnly.length} skills (${resumeOnly.slice(0, 3).join(", ")}) that were not detected in inspected GitHub evidence (scope: public repositories, topics, and languages).`);
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
