// ═══════════════════════════════════════════════════════════════════════════════
// Scoring Engine v6 — Evidence-Based Additive Architecture
//
// DESIGN PRINCIPLES:
//  1. Evidence-Based Accumulation: Users earn points for positive proof of work
//     rather than losing points repeatedly for missing items.
//  2. Single Source of Truth: Each metric is evaluated ONCE in its authoritative category.
//  3. Calibrated Score Benchmarks:
//     - Beginner Student         : 45–60
//     - Average CS Student       : 60–70
//     - Good MERN Developer      : 75–85
//     - Strong Open-Source       : 85–92
//     - Exceptional Developer    : 93–100
//  4. Fully Explainable: Explicit evidence positive/negative signals per metric.
// ═══════════════════════════════════════════════════════════════════════════════

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function pct(numerator, denominator) {
  if (!denominator || denominator === 0) return 0;
  return numerator / denominator;
}

export function getScoringTier(score) {
  if (score >= 93) return { label: "Exceptional Candidate", color: "#a855f7", badge: "pass" };
  if (score >= 85) return { label: "Interview Ready", color: "var(--green)", badge: "pass" };
  if (score >= 75) return { label: "Hiring Ready", color: "var(--cyan)", badge: "pass" };
  if (score >= 60) return { label: "Strong Potential", color: "var(--blue)", badge: "info" };
  if (score >= 45) return { label: "Needs Improvement", color: "#f59e0b", badge: "warn" };
  return { label: "Major Gaps", color: "var(--red)", badge: "warn" };
}

function buildEmptyScore() {
  return { score: 0, tier: getScoringTier(0), breakdown: [], improvements: [], positiveSignals: [], negativeSignals: [] };
}

// ─── 1. GitHub Activity & Profile (Evidence-Based 0–100) ──────────────────────
export function calculateGitHubScore(githubData) {
  if (!githubData || !githubData.profile) return buildEmptyScore();

  const profile = githubData.profile || {};
  const stats = githubData.stats || {};
  const languageDistribution = githubData.languageDistribution || [];
  const hasProfileReadme = githubData.hasProfileReadme || false;

  const commitCount90Days = stats.commitCount90Days || 0;
  const currentStreak = stats.currentStreak || 0;
  const totalStars = stats.totalStars || 0;
  const ownedRepos = stats.ownedRepos || 0;
  const followers = profile.followers || 0;

  const breakdown = [];
  const improvements = [];
  const positiveSignals = [];
  const negativeSignals = [];

  // Base score for having an active public profile
  let score = 40;

  // Metric A: Commit Cadence (+0 to +20 pts)
  let commitPts = 0;
  if (commitCount90Days >= 40) commitPts = 20;
  else if (commitCount90Days >= 20) commitPts = 15;
  else if (commitCount90Days >= 10) commitPts = 10;
  else if (commitCount90Days > 0) commitPts = 5;

  let streakPts = currentStreak >= 7 ? 5 : (currentStreak >= 3 ? 3 : 0);
  const activityPts = commitPts + streakPts;
  score += activityPts;

  breakdown.push({
    score: 15 + activityPts, max: 40,
    label: "Commit Cadence & Consistency",
    evidence: commitCount90Days > 0
      ? `Earned +${activityPts} pts for ${commitCount90Days} commits in last 90 days${currentStreak > 0 ? ` (${currentStreak}-day active streak)` : ""}`
      : "No recent public commit activity detected (+0 pts earned)",
  });

  if (commitCount90Days >= 20) positiveSignals.push(`Earned points for consistent commit history (${commitCount90Days} commits)`);
  else {
    negativeSignals.push(`Low commit frequency (+${commitPts} pts out of 20)`);
    improvements.push({
      action: "Maintain a 3–4 day weekly commit rhythm on GitHub",
      why: "Commit frequency demonstrates active coding habits to recruiters.",
      how: "Push daily progress or small updates to your GitHub repositories.",
      points: 8, difficulty: "Easy", timeMinutes: 15, priority: 1,
    });
  }

  // Metric B: Stars & Community Reputation (+0 to +15 pts)
  let starPts = totalStars >= 20 ? 10 : (totalStars >= 5 ? 7 : (totalStars > 0 ? 3 : 0));
  let followerPts = followers >= 20 ? 5 : (followers >= 5 ? 3 : 0);
  const repPts = starPts + followerPts;
  score += repPts;

  breakdown.push({
    score: 10 + repPts, max: 25,
    label: "Community Stars & Followers",
    evidence: `Earned +${repPts} pts for ${totalStars} stars across repos and ${followers} followers`,
  });

  if (totalStars >= 5 || followers >= 5) positiveSignals.push(`Community recognition (+${repPts} pts)`);

  // Metric C: Profile Fields & Overview README (+0 to +20 pts)
  const profileFields = [
    { name: "name", pass: !!(profile.name && profile.name !== profile.username), pts: 3 },
    { name: "bio", pass: !!(profile.bio && profile.bio.trim().length > 10), pts: 4 },
    { name: "avatar", pass: !!profile.avatar, pts: 3 },
    { name: "location", pass: !!(profile.location || profile.company), pts: 2 },
    { name: "website", pass: !!profile.website, pts: 3 },
  ];
  const profilePts = profileFields.reduce((s, f) => s + (f.pass ? f.pts : 0), 0);
  const readmePts = hasProfileReadme ? 5 : 0;
  const compPts = profilePts + readmePts;
  score += compPts;

  breakdown.push({
    score: 15 + compPts, max: 35,
    label: "Profile Completeness & Overview README",
    evidence: `Earned +${compPts} pts for completing ${profileFields.filter((f) => f.pass).length}/${profileFields.length} profile fields${hasProfileReadme ? " and Profile README" : ""}`,
  });

  if (hasProfileReadme) positiveSignals.push("Earned +5 pts for dedicated Profile README");
  else {
    negativeSignals.push("Missing Profile README (+0 out of 5 pts)");
    improvements.push({
      action: "Create a custom GitHub Profile README (username/username repo)",
      why: "A profile README provides an immediate summary of your skills to recruiters.",
      how: "Create a repo matching your GitHub username and add a README.md.",
      points: 5, difficulty: "Easy", timeMinutes: 15, priority: 2,
    });
  }

  const finalScore = clamp(Math.round(score), 40, 100);

  return {
    score: finalScore,
    tier: getScoringTier(finalScore),
    breakdown,
    improvements,
    positiveSignals,
    negativeSignals,
  };
}

// ─── 2. Documentation Depth (Evidence-Based 0–100) ───────────────────────────
export function calculateDocumentationScore(githubData) {
  if (!githubData || !githubData.profile) return buildEmptyScore();

  const stats = githubData.stats || {};
  const ownedRepos = Math.max(stats.ownedRepos || 0, 1);
  const reposWithDescription = stats.reposWithDescription || 0;
  const reposWithTopics = stats.reposWithTopics || 0;
  const avgReadmeScore = stats.avgReadmeScore || 0;

  const breakdown = [];
  const improvements = [];
  const positiveSignals = [];
  const negativeSignals = [];

  // Base score for published repositories
  let score = 35;

  // Descriptions (+0 to +25 pts)
  const descRatio = pct(reposWithDescription, ownedRepos);
  const descPts = Math.round(descRatio * 25);
  score += descPts;
  breakdown.push({
    score: 10 + descPts, max: 35,
    label: "Repository Descriptions Coverage",
    evidence: `Earned +${descPts} pts: ${reposWithDescription}/${ownedRepos} repos have descriptions (${Math.round(descRatio * 100)}%)`,
  });

  // Topics (+0 to +20 pts)
  const topicsRatio = pct(reposWithTopics, ownedRepos);
  const topicsPts = Math.round(topicsRatio * 20);
  score += topicsPts;
  breakdown.push({
    score: 10 + topicsPts, max: 30,
    label: "Topic Tags & Categorization",
    evidence: `Earned +${topicsPts} pts: ${reposWithTopics}/${ownedRepos} repos tagged with topics (${Math.round(topicsRatio * 100)}%)`,
  });

  // README Quality (+0 to +20 pts)
  const readmePts = Math.round((avgReadmeScore / 100) * 20);
  score += readmePts;
  breakdown.push({
    score: 15 + readmePts, max: 35,
    label: "Repository README Content Depth",
    evidence: `Earned +${readmePts} pts based on project README depth (${avgReadmeScore}/100 quality rating)`,
  });

  if (descRatio >= 0.6) positiveSignals.push("Strong repo description coverage");
  else {
    negativeSignals.push("Repositories missing header descriptions");
    improvements.push({
      action: "Add concise descriptions to all public repositories",
      why: "Recruiters skip repositories without clear one-line explanations.",
      how: "Edit the header settings of your repositories on GitHub to add a 10-word summary.",
      points: 10, difficulty: "Easy", timeMinutes: 10, priority: 1,
    });
  }

  const finalScore = clamp(Math.round(score), 35, 100);

  return {
    score: finalScore,
    tier: getScoringTier(finalScore),
    breakdown,
    improvements,
    positiveSignals,
    negativeSignals,
  };
}

// ─── 3. Projects & Engineering Proof (Evidence-Based 0–100) ───────────────────
export function calculateProjectQualityScore(githubData) {
  if (!githubData || !githubData.profile) return buildEmptyScore();

  const stats = githubData.stats || {};
  const topRepos = githubData.topRepos || [];

  const breakdown = [];
  const improvements = [];
  const positiveSignals = [];
  const negativeSignals = [];

  if (!topRepos || topRepos.length === 0) {
    return {
      score: 30,
      tier: getScoringTier(30),
      breakdown: [{ score: 30, max: 100, label: "Public Repositories", evidence: "No public repositories found" }],
      improvements: [{
        action: "Publish your first public code repository on GitHub",
        why: "Recruiters cannot verify technical ability without public code proof.",
        how: "Push a clean project repository with a README.",
        points: 30, difficulty: "Medium", timeMinutes: 45, priority: 1,
      }],
      positiveSignals: [], negativeSignals: ["No public code repositories found"],
    };
  }

  // Base score for having repositories
  let score = 35;

  // 1. Live Deployment Demos (+0 to +30 pts)
  const liveRepos = topRepos.filter((r) => r.hasHomepage).length;
  const liveRatio = pct(liveRepos, topRepos.length);
  const livePts = Math.round(liveRatio * 30);
  score += livePts;

  breakdown.push({
    score: 10 + livePts, max: 40,
    label: "Live Demo Deployments",
    evidence: liveRepos > 0
      ? `Earned +${livePts} pts: ${liveRepos}/${topRepos.length} top projects have live demo links`
      : "No live demo URLs configured (+0 out of 30 pts earned)",
  });

  if (liveRepos > 0) positiveSignals.push(`Earned +${livePts} pts for live deployment demos`);
  else {
    negativeSignals.push("Top projects lack live demo deployment links");
    improvements.push({
      action: "Deploy top projects and paste live URLs in repo headers",
      why: "Live demos allow non-technical recruiters to verify working software instantly.",
      how: "Host on Vercel/Netlify/Render and add live link to repo Website field.",
      points: 15, difficulty: "Easy", timeMinutes: 15, priority: 1,
    });
  }

  // 2. Project Recency (+0 to +20 pts)
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const recentRepos = topRepos.filter((r) => r.lastPushed && new Date(r.lastPushed).getTime() > sixtyDaysAgo).length;
  const recentPts = Math.round(pct(recentRepos, topRepos.length) * 20);
  score += recentPts;
  // 5. Tech diversity (0–15 pts)
  const uniqueLangs = new Set(topRepos.map((r) => r.language).filter(Boolean));
  const langPts = clamp(uniqueLangs.size * 3, 0, 15);
  score += langPts;
  breakdown.push({
    score: langPts, max: 15,
    label: "Tech Diversity",
    evidence: `${uniqueLangs.size} different languages across top repositories`,
  });

  if (liveRepos === 0) {
    improvements.push({
      action: "Deploy your projects and add live demo links",
      why: "Live demos are the most powerful signal in your portfolio. Recruiters can evaluate your work without reading code.",
      how: "Use Vercel (frontend), Railway or Render (backend) — all free. Add the deployment URL to your repo's Homepage field.",
      points: 12,
      difficulty: "Medium",
      timeMinutes: 30,
      priority: 2,
    });
  }

  const completeRepos = topRepos.filter((r) => r.description && r.topics?.length > 0).length;
  if (completeRepos < Math.ceil(topRepos.length * 0.7)) {
    improvements.push({
      action: "Add detailed descriptions and topics to your top repositories",
      why: "Incomplete repos signal you don't care about presentation — which makes recruiters wonder about your code quality too.",
      how: "For each repo: add a 1-2 sentence description, add 3–5 relevant topics (react, nodejs, portfolio, etc.), and add a homepage link if deployed.",
      points: 8,
      difficulty: "Easy",
      timeMinutes: 20,
      priority: 2,
    });
  }

  return {
    score: clamp(Math.round(score), 15, 100),
    breakdown,
    improvements,
  };
}

// ─── Portfolio Website Score (0–100) ──────────────────────────────────────────
export function calculatePortfolioScore(portfolioData) {
  if (!portfolioData || !portfolioData.accessible) {
    return {
      score: 0,
      breakdown: [{ score: 0, max: 100, label: "Portfolio", evidence: "No portfolio URL provided or site was inaccessible" }],
      improvements: [{
        action: "Build and deploy a portfolio website",
        why: "A portfolio website is the #1 differentiator between candidates with similar GitHub profiles. Recruiters expect developers to have one.",
        how: "Use a template from GitHub (search 'portfolio template') and deploy to Vercel or Netlify for free. Takes 30 minutes.",
        points: 25,
        difficulty: "Medium",
        timeMinutes: 120,
        priority: 1,
      }],
    };
  }

  const { checklist } = portfolioData;
  if (!checklist) return { score: 0, breakdown: [], improvements: [] };

  const weights = {
    isHttps:                  { pts: 10, label: "HTTPS Secure",       category: "Security" },
    hasViewport:              { pts: 8,  label: "Mobile Responsive",   category: "Mobile" },
    hasMetaDescription:       { pts: 8,  label: "Meta Description",    category: "SEO" },
    hasEmail:                 { pts: 8,  label: "Contact Email",       category: "Contact" },
    hasResumeLink:            { pts: 8,  label: "Resume Link",         category: "Content" },
    hasProjectSection:        { pts: 8,  label: "Projects Section",    category: "Content" },
    hasH1:                    { pts: 5,  label: "H1 Heading",          category: "SEO" },
    hasOgTags:                { pts: 5,  label: "Open Graph Tags",     category: "SEO" },
    hasGithubLink:            { pts: 5,  label: "GitHub Link",         category: "Links" },
    hasLinkedinLink:          { pts: 5,  label: "LinkedIn Link",       category: "Links" },
    hasContactSection:        { pts: 5,  label: "Contact Section",     category: "Contact" },
    hasTitle:                 { pts: 5,  label: "Page Title",          category: "SEO" },
    hasGoodAltTags:           { pts: 4,  label: "Image Alt Tags",      category: "Accessibility" },
    hasOgImage:               { pts: 3,  label: "Social Share Image",  category: "SEO" },
    isAccessible:             { pts: 3,  label: "Accessible",          category: "Accessibility" },
    hasTwitterLink:           { pts: 3,  label: "Twitter/X Link",      category: "Links" },
    hasReasonableSize:        { pts: 2,  label: "Fast Loading",        category: "Performance" },
  };

  const breakdown = [];
  const improvements = [];
  let earned = 0;
  let possible = 0;

  Object.entries(weights).forEach(([key, { pts, label, category }]) => {
    possible += pts;
    const pass = checklist[key]?.pass;
    if (pass) {
      earned += pts;
    } else {
      breakdown.push({ score: 0, max: pts, label, evidence: `${category}: Missing or failing` });
      if (pts >= 5) {
        improvements.push({
          action: `Fix: ${label}`,
          why: `${category} issue — this reduces your professional credibility.`,
          how: checklist[key]?.hint || `Add or fix the ${label} on your portfolio website.`,
          points: pts,
          difficulty: pts >= 8 ? "Medium" : "Easy",
          timeMinutes: pts >= 8 ? 15 : 5,
          priority: pts >= 8 ? 1 : 2,
        });
      }
    }
  });

  const finalScore = possible > 0 ? clamp(Math.round((earned / possible) * 100), 0, 100) : 0;

  return {
    score: finalScore,
    breakdown: Object.entries(weights).map(([key, { pts, label }]) => ({
      score: checklist[key]?.pass ? pts : 0,
      max: pts,
      label,
      evidence: checklist[key]?.pass ? `✅ ${label} — passing` : `❌ ${label} — needs fix`,
    })),
    improvements: improvements.sort((a, b) => b.points - a.points),
  };
}

// ─── Hiring Readiness Score (0–100) ───────────────────────────────────────────
export function calculateHiringReadiness(scores, githubData, portfolioData, resumeAnalysis = null) {
  const profile = githubData?.profile || {};
  const stats = githubData?.stats || {};
  const hasProfileReadme = githubData?.hasProfileReadme || false;
  const resumeScore = resumeAnalysis?.atsScore || 0;

  let base = 50;
  if (portfolioData?.accessible && resumeScore > 0) {
    base = scores.github * 0.25 + scores.projectQuality * 0.20 + scores.documentation * 0.15 + scores.portfolio * 0.20 + resumeScore * 0.20;
  } else if (portfolioData?.accessible) {
    base = scores.github * 0.30 + scores.projectQuality * 0.25 + scores.documentation * 0.20 + scores.portfolio * 0.25;
  } else if (resumeScore > 0) {
    base = scores.github * 0.35 + scores.projectQuality * 0.25 + scores.documentation * 0.20 + resumeScore * 0.20;
  } else {
    base = scores.github * 0.40 + scores.projectQuality * 0.35 + scores.documentation * 0.25;
  }

  // Cap hiring readiness so it never hits 100/100 unless commit activity >= 30, portfolio is live, and README exists
  let maxCap = 95;
  if ((stats.commitCount90Days || 0) < 15 || !hasProfileReadme) {
    maxCap = 85;
  }

  return clamp(Math.round(base), 20, maxCap);
}

// ─── Calculate All Scores (Handles Full 360°, GitHub-Only, Portfolio-Only, Resume-Only) ───
export function calculateAllScores(githubData, portfolioData, targetRole = "fullstack", resumeAnalysis = null) {
  const hasGithub = !!(githubData && githubData.profile);
  const hasPortfolio = !!(portfolioData && portfolioData.accessible);
  const hasResume = !!(resumeAnalysis && resumeAnalysis.atsScore);

  const githubResult    = hasGithub ? calculateGitHubScore(githubData) : buildEmptyScore();
  const docResult       = hasGithub ? calculateDocumentationScore(githubData) : buildEmptyScore();
  const projResult      = hasGithub ? calculateProjectQualityScore(githubData) : buildEmptyScore();
  const portfolioResult = hasPortfolio ? calculatePortfolioScore(portfolioData) : buildEmptyScore();

  const scores = {
    github:         githubResult.score,
    documentation:  docResult.score,
    projectQuality: projResult.score,
    portfolio:      portfolioResult.score,
  };

  const hiringReadiness = hasGithub
    ? calculateHiringReadiness(scores, githubData, portfolioData, resumeAnalysis)
    : (hasPortfolio ? scores.portfolio : (hasResume ? (resumeAnalysis.atsScore || 70) : 50));

  const effectiveAtsScore = hasResume ? resumeAnalysis.atsScore : 0;

  // Evidence-Based Composite Overall Weights (Sum = 1.00 per active input mode)
  let overall = 50;
  if (hasGithub && hasPortfolio && hasResume) {
    // Full 360° Mode: GitHub (30%), Projects (25%), Portfolio (25%), Resume (20%)
    overall = Math.round(
      scores.github * 0.30 +
      scores.projectQuality * 0.25 +
      scores.portfolio * 0.25 +
      effectiveAtsScore * 0.20
    );
  } else if (hasGithub && hasPortfolio) {
    // GitHub + Portfolio Mode: GitHub (40%), Projects (35%), Portfolio (25%)
    overall = Math.round(
      scores.github * 0.40 +
      scores.projectQuality * 0.35 +
      scores.portfolio * 0.25
    );
  } else if (hasGithub && hasResume) {
    // GitHub + Resume Mode: GitHub (40%), Projects (35%), Resume (25%)
    overall = Math.round(
      scores.github * 0.40 +
      scores.projectQuality * 0.35 +
      effectiveAtsScore * 0.25
    );
  } else if (hasPortfolio && hasResume) {
    // Portfolio + Resume Mode: Portfolio (55%), Resume (45%)
    overall = Math.round(
      scores.portfolio * 0.55 +
      effectiveAtsScore * 0.45
    );
  } else if (hasGithub) {
    // GitHub Only Mode: GitHub Activity (55%), Projects Quality (45%)
    overall = Math.round(
      scores.github * 0.55 +
      scores.projectQuality * 0.45
    );
  } else if (hasPortfolio) {
    overall = scores.portfolio;
  } else if (hasResume) {
    overall = effectiveAtsScore;
  }

  // Merge all active improvements with explainable metadata
  const topRepoNames = githubData?.topRepos?.slice(0, 3).map((r) => r.name) || [];

  const allImprovements = [
    ...githubResult.improvements,
    ...docResult.improvements,
    ...projResult.improvements,
    ...portfolioResult.improvements,
  ]
    .sort((a, b) => a.priority - b.priority || b.points - a.points)
    .slice(0, 12)
    .map((item) => ({
      ...item,
      confidenceLevel: "High Confidence",
      affectedRepos: item.action.toLowerCase().includes("readme") || item.action.toLowerCase().includes("topic") || item.action.toLowerCase().includes("description")
        ? (topRepoNames.length > 0 ? topRepoNames : ["GitHub Repositories"])
        : ["Public Profile"],
      affectedResumeSection: item.action.toLowerCase().includes("resume") || item.action.toLowerCase().includes("impact")
        ? "Resume Work Experience Section"
        : "GitHub Public Repositories",
    }));

  const scoreBreakdowns = {
    github:         githubResult.breakdown,
    documentation:  docResult.breakdown,
    projectQuality: projResult.breakdown,
    portfolio:      portfolioResult.breakdown,
  };

  return {
    scores: { ...scores, hiringReadiness, overall: clamp(overall, 20, 100) },
    scoreBreakdowns,
    improvements: allImprovements,
  };
}

// ─── Skill Gap Detection ───────────────────────────────────────────────────────
const ROLE_SKILLS = {
  frontend: {
    core:       ["HTML", "CSS", "JavaScript", "TypeScript"],
    frameworks: ["React", "Vue", "Angular", "Svelte", "Next.js"],
    styling:    ["Tailwind", "Sass", "Styled Components"],
    testing:    ["Jest", "Cypress", "Playwright", "Testing Library"],
  },
  react: {
    core:       ["JavaScript", "TypeScript", "React", "Next.js"],
    state:      ["Redux", "Zustand", "Context API", "React Query"],
    styling:    ["Tailwind", "CSS Modules"],
    testing:    ["Jest", "Testing Library"],
  },
  backend: {
    core:       ["Node.js", "Python", "Java", "Go", "Rust"],
    frameworks: ["Express", "FastAPI", "Django", "Spring Boot", "NestJS"],
    databases:  ["PostgreSQL", "MySQL", "MongoDB", "Redis"],
    tools:      ["REST API", "GraphQL", "Docker", "JWT"],
  },
  node: {
    core:       ["JavaScript", "TypeScript", "Node.js"],
    frameworks: ["Express", "NestJS", "Fastify"],
    databases:  ["MongoDB", "PostgreSQL", "Redis"],
    tools:      ["JWT", "REST API", "Docker"],
  },
  python_dev: {
    core:       ["Python"],
    frameworks: ["FastAPI", "Django", "Flask"],
    databases:  ["PostgreSQL", "SQLite", "Redis"],
    tools:      ["Docker", "PyTest", "Celery"],
  },
  java_dev: {
    core:       ["Java"],
    frameworks: ["Spring Boot", "Hibernate"],
    databases:  ["PostgreSQL", "MySQL", "Oracle"],
    tools:      ["Maven", "Gradle", "Docker"],
  },
  fullstack: {
    frontend:   ["React", "Vue", "Next.js", "TypeScript", "HTML", "CSS"],
    backend:    ["Node.js", "Express", "Python", "PostgreSQL", "MongoDB"],
    devops:     ["Docker", "Git", "CI/CD", "Linux"],
    tools:      ["REST API", "GraphQL", "JWT"],
  },
  devops: {
    containers: ["Docker", "Kubernetes", "Helm"],
    cloud:      ["AWS", "GCP", "Azure"],
    cicd:       ["GitHub Actions", "Jenkins", "GitLab CI"],
    iac:        ["Terraform", "Ansible"],
    monitoring: ["Prometheus", "Grafana"],
  },
  mobile: {
    core:       ["React Native", "Flutter", "Swift", "Kotlin"],
    frameworks: ["Expo", "Ionic"],
    tools:      ["Firebase", "REST API", "SQLite"],
  },
  ai_ml: {
    core:       ["Python", "R"],
    frameworks: ["TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy"],
    ai_tools:   ["Jupyter", "Hugging Face", "OpenAI API", "LangChain"],
    cloud:      ["AWS SageMaker", "GCP Vertex AI", "FastAPI"],
  },
  data_science: {
    core:       ["Python", "R", "SQL"],
    libraries:  ["Pandas", "NumPy", "Scikit-learn", "SciPy"],
    viz:        ["Matplotlib", "Seaborn", "Tableau", "PowerBI"],
    tools:      ["Jupyter", "Spark", "PostgreSQL"],
  },
};

export function detectMissingSkills(detectedSkills, targetRole) {
  const role = ROLE_SKILLS[targetRole] || ROLE_SKILLS[targetRole?.replace("-", "_")] || ROLE_SKILLS.fullstack;
  const detected = (detectedSkills || []).map((s) => s.toLowerCase());

  const result = {};
  Object.entries(role).forEach(([category, skills]) => {
    const present = skills.filter((skill) =>
      detected.some((d) => d.includes(skill.toLowerCase()))
    );
    const missing = skills.filter(
      (skill) => !detected.some((d) => d.includes(skill.toLowerCase()))
    );
    result[category] = { skills, present, missing };
  });

  return result;
}
