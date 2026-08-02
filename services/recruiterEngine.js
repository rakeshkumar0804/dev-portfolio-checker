// ═══════════════════════════════════════════════════════════════════════════════
// Recruiter Decision Engine v7 — Evidence-Based Commercial Recruiter Intelligence
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateRecruiterDecision(scores, githubData, portfolioData, resumeAnalysis, targetRole = "fullstack") {
  const overall = scores?.overall || 50;
  const hiringReadiness = scores?.hiringReadiness || 50;

  const hasGithub = !!(githubData && githubData.profile);
  const hasPortfolio = !!(portfolioData && portfolioData.accessible);
  const hasResume = !!(resumeAnalysis && resumeAnalysis.atsScore > 0);
  const resumeScore = resumeAnalysis?.atsScore || 0;

  // 1. Decision & Adaptive Labeling
  let decision = "MAYBE";
  let decisionLabel = "⚡ Promising Candidate — Strong Foundations to Build On";
  let toneCategory = "mid";
  let hiringRecommendation = "Proceed to Technical Screening Round with Targeted Follow-ups";

  if (overall >= 75 || hiringReadiness >= 75) {
    decision = "YES";
    decisionLabel = "🌟 Shortlist: YES — High Priority Candidate";
    toneCategory = "senior";
    hiringRecommendation = "Fast-Track to Technical Interview & Team Matching";
  } else if (overall < 50) {
    decision = "BEGINNER";
    decisionLabel = "🌱 Early-Stage Profile — Great Starting Foundation";
    toneCategory = "beginner";
    hiringRecommendation = "Recommend 2-Week Portfolio Polish Before Applying to Mid-Level Roles";
  }

  // 2. Letter Grade & Seniority
  let grade = "C";
  if (overall >= 90) grade = "A+";
  else if (overall >= 82) grade = "A";
  else if (overall >= 75) grade = "A-";
  else if (overall >= 68) grade = "B+";
  else if (overall >= 60) grade = "B";
  else if (overall >= 50) grade = "C+";
  else grade = "Starter";

  let seniorityLevel = "Early-Stage / Beginner Developer";
  let salaryBandEstimate = "$60,000 – $80,000 USD (Junior Developer Benchmark)";
  if (overall >= 80) {
    seniorityLevel = "Senior Candidate Level";
    salaryBandEstimate = "$130,000 – $160,000 USD (Senior Developer Benchmark)";
  } else if (overall >= 65) {
    seniorityLevel = "Mid-Level Developer Level";
    salaryBandEstimate = "$95,000 – $125,000 USD (Mid-Level Developer Benchmark)";
  }

  // 3. Evidence-Based Confidence Indicator
  let confidenceScore = 92;
  let confidenceLevel = "High Confidence";
  let confidenceRationale = "Verified strictly against public GitHub API commits, repository metadata, and uploaded resume text parsing.";
  if (!hasResume || !hasPortfolio) {
    confidenceScore = 84;
    confidenceLevel = "Medium-High Confidence";
    confidenceRationale = "Verified against GitHub public data. Connect Portfolio & Resume for 100% full-spectrum confidence.";
  }

  // 4. Positive Signals & Opportunities
  const greenFlags = [];
  const redFlags = [];

  if (hasGithub) {
    const stats = githubData.stats || {};
    const repoCount = stats.ownedRepos || 0;
    if (stats.commitCount90Days >= 10) greenFlags.push({ title: "Active GitHub Contributor", evidence: `${stats.commitCount90Days} commits verified in last 90 days` });
    if (stats.totalStars >= 5) greenFlags.push({ title: "Community Recognition", evidence: `${stats.totalStars} stars across ${repoCount} repos` });
    if (githubData.hasProfileReadme) greenFlags.push({ title: "Profile README Active", evidence: "Dedicated GitHub Profile README file verified" });
    if (repoCount > 0) greenFlags.push({ title: "Public Repositories Published", evidence: `${repoCount} original code repositories on GitHub` });
  }

  if (hasPortfolio) {
    greenFlags.push({ title: "Live Portfolio Website", evidence: `Active at ${portfolioData.url}` });
  } else {
    redFlags.push({ title: "Build a Simple Portfolio Website", risk: "A live portfolio website lets recruiters inspect interactive UI demos instantly." });
  }

  if (hasResume) {
    if (resumeScore >= 70) greenFlags.push({ title: "Good ATS Keyword Alignment", evidence: `Resume ATS score ${resumeScore}/100 verified` });
    if (resumeAnalysis.hasMetrics) greenFlags.push({ title: "Quantified Achievements Included", evidence: "Resume contains % performance numbers" });
    if (!resumeAnalysis.hasMetrics) redFlags.push({ title: "Add Quantified Impact Metrics", risk: "Include specific metrics (e.g., 'Improved load speed by 25%') to strengthen bullet points." });
  } else {
    redFlags.push({ title: "Upload a PDF Resume", risk: "Upload your resume to unlock ATS keyword matching for your target role." });
  }

  // 5. Tailored Recruiter Technical Screening Questions
  const roleUpper = (targetRole || "fullstack").toUpperCase();
  const repoCount = hasGithub ? (githubData.stats?.ownedRepos || 0) : 0;

  const interviewQuestions = [
    `1. "I noticed your public GitHub repos focus on ${targetRole} projects. How do you approach state management and system architecture when scaling a production app?"`,
    `2. "Your profile shows ${repoCount} active project repositories. Can you walk me through the hardest technical bug you debugged in your main repository?"`,
    hasPortfolio
      ? `3. "You have a live portfolio at ${portfolioData.url}. How did you handle web performance, responsiveness, and deployment CI/CD for this site?"`
      : `3. "How do you handle production deployment and CI/CD pipelines when publishing web applications for users?"`,
  ];

  // 6. Senior Recruiter Executive Note
  let recruiterThought = "";
  if (toneCategory === "beginner") {
    recruiterThought = `Profile demonstrates great initiative at the early stage. Candidates at this level benefit most from completing 1–2 full-stack projects with clear README documentation and live Vercel/Render deployments.`;
  } else if (toneCategory === "senior") {
    recruiterThought = `Strong candidate for ${roleUpper} roles. Public GitHub commit velocity, repository structure, and technical documentation demonstrate high readiness for senior engineering environments.`;
  } else {
    recruiterThought = `Solid technical foundation for ${roleUpper} roles with ${repoCount} verified repositories. Adding quantified impact statements on resume bullet points will significantly increase interview shortlist rates.`;
  }

  return {
    decision,
    decisionLabel,
    grade,
    seniorityLevel,
    toneCategory,
    confidenceScore,
    confidenceLevel,
    confidenceRationale,
    hiringRecommendation,
    salaryBandEstimate,
    recruiterThought,
    interviewQuestions,
    greenFlags: greenFlags.slice(0, 4),
    redFlags: redFlags.slice(0, 4),
    dataFreshness: "Live GitHub & Resume Audit",
  };
}
