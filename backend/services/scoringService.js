// ═══════════════════════════════════════════════════════════════════════════════
// Scoring Engine v4 — Calibrated, Evidence-Based, Explainable
//
// DESIGN PRINCIPLES:
//  1. Every score function returns { score, breakdown[], improvements[] }
//  2. Thresholds are calibrated against real developer profiles
//  3. No score is 0 for a developer with any public activity
//  4. Improvement items include: action, why, how, points, difficulty, timeMinutes, priority
//  5. Overall = weighted composite, NOT a simple average
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

// Gentle logarithmic scaler: value/threshold = 1 → maxPts, 0.1 → ~50% of maxPts
function logScore(value, threshold, maxPts) {
  if (!value || value <= 0) return 0;
  const ratio = Math.min(value / threshold, 1);
  return Math.round((Math.log(1 + ratio * 9) / Math.log(10)) * maxPts);
}

function pct(numerator, denominator) {
  if (!denominator || denominator === 0) return 0;
  return numerator / denominator;
}

// ─── GitHub Profile Score (0–100) ─────────────────────────────────────────────
export function calculateGitHubScore(githubData) {
  const { profile, stats, languageDistribution, hasProfileReadme } = githubData;
  if (!profile) return buildEmptyScore();

  const breakdown = [];
  const improvements = [];
  let score = 0;

  // ── 1. Activity Score (0–25 pts) ──────────────────────────────────────────
  // Realistic: 10 commits/90d = decent, 30+ = active, 60+ = very active
  const activityScore = clamp(logScore(stats.commitCount90Days, 40, 25), 0, 25);
  score += activityScore;
  breakdown.push({
    score: activityScore,
    max: 25,
    label: "Commit Activity",
    evidence: stats.commitCount90Days > 0
      ? `${stats.commitCount90Days} commits in last 90 days${stats.currentStreak > 0 ? `, ${stats.currentStreak}-day streak` : ""}`
      : "No recent commits detected",
  });
  if (stats.commitCount90Days < 10) {
    improvements.push({
      action: "Commit code more consistently — aim for 3–4 times per week",
      why: "Commit frequency is the single most visible signal to recruiters scanning GitHub. An empty contribution graph is an immediate red flag.",
      how: "Work on any project daily — even documentation updates, README improvements, or small bug fixes count. Push your local commits to GitHub.",
      points: 8,
      difficulty: "Medium",
      timeMinutes: 0,
      priority: 1,
    });
  }

  // ── 2. Community Reputation (0–20 pts) ────────────────────────────────────
  // Stars: 1 star = good, 10 = great, 50 = excellent (for most devs)
  // Followers: 10 = active, 50 = well-known, 200+ = influencer
  const starScore = clamp(logScore(stats.totalStars, 30, 12), 0, 12);
  const followerScore = clamp(logScore(profile.followers, 100, 8), 0, 8);
  const reputationScore = starScore + followerScore;
  score += reputationScore;
  breakdown.push({
    score: reputationScore,
    max: 20,
    label: "Community Reputation",
    evidence: `${stats.totalStars} stars across repos · ${profile.followers} followers`,
  });
  if (stats.totalStars < 5) {
    improvements.push({
      action: "Build projects that solve real problems to attract stars",
      why: "Stars are the most credible social proof on GitHub. Even 5–10 stars signals that others found your work useful.",
      how: "Share your projects on Reddit (r/webdev, r/programming), Product Hunt, or Hacker News. Add to GitHub topic collections.",
      points: 4,
      difficulty: "Hard",
      timeMinutes: 60,
      priority: 4,
    });
  }

  // ── 3. Profile Completeness (0–20 pts) ────────────────────────────────────
  const checks = [
    { key: "name",     pass: !!(profile.name && profile.name !== profile.username), pts: 3, label: "Display name set" },
    { key: "bio",      pass: !!(profile.bio && profile.bio.trim().length > 10),    pts: 5, label: "Bio filled in" },
    { key: "avatar",   pass: !!profile.avatar,                                      pts: 3, label: "Profile picture" },
    { key: "location", pass: !!(profile.location || profile.company),              pts: 2, label: "Location/Company" },
    { key: "website",  pass: !!(profile.website),                                   pts: 4, label: "Website/Portfolio link" },
    { key: "contact",  pass: !!(profile.email || profile.twitterUsername),          pts: 3, label: "Contact method visible" },
  ];
  const completenessScore = checks.reduce((s, c) => s + (c.pass ? c.pts : 0), 0);
  score += completenessScore;
  const failedChecks = checks.filter((c) => !c.pass);
  breakdown.push({
    score: completenessScore,
    max: 20,
    label: "Profile Completeness",
    evidence: `${checks.filter((c) => c.pass).length}/${checks.length} fields complete: ${failedChecks.map((c) => c.label).join(", ") || "All complete!"}`,
  });
  if (!profile.bio || profile.bio.trim().length < 10) {
    improvements.push({
      action: "Write a compelling GitHub bio (1–2 sentences)",
      why: "Your bio is the first text a recruiter reads. It should tell them your role, stack, and what excites you in 160 characters.",
      how: 'Go to GitHub → Settings → Edit profile → Bio. Example: "Full-stack developer · React, Node.js, MongoDB · Building products that matter"',
      points: 5,
      difficulty: "Easy",
      timeMinutes: 5,
      priority: 1,
    });
  }
  if (!profile.website) {
    improvements.push({
      action: "Add your portfolio URL to your GitHub profile",
      why: "Your profile website link is shown prominently on every page of your GitHub. It's free traffic to your portfolio.",
      how: "Go to GitHub → Settings → Edit profile → Website. Add your portfolio or LinkedIn URL.",
      points: 4,
      difficulty: "Easy",
      timeMinutes: 2,
      priority: 2,
    });
  }

  // ── 4. Profile README (0–15 pts) ──────────────────────────────────────────
  const readmeScore = hasProfileReadme ? 15 : 0;
  score += readmeScore;
  breakdown.push({
    score: readmeScore,
    max: 15,
    label: "Profile README",
    evidence: hasProfileReadme
      ? "✅ Profile README exists — great first impression"
      : "❌ No profile README — you're missing a prime opportunity",
  });
  if (!hasProfileReadme) {
    improvements.push({
      action: `Create a GitHub profile README at github.com/${profile.username}/${profile.username}`,
      why: "Profile READMEs appear directly on your GitHub page and can showcase your personality, skills, and top projects beautifully. Recruiters love them.",
      how: `1. Go to github.com/new\n2. Create repo named exactly "${profile.username}"\n3. Make it public\n4. Add README.md with your intro, skills, stats`,
      points: 15,
      difficulty: "Easy",
      timeMinutes: 20,
      priority: 1,
    });
  }

  // ── 5. Repository Quality (0–20 pts) ──────────────────────────────────────
  let repoQualityScore = 0;
  const ownedCount = Math.max(stats.ownedRepos, 1);
  const descRatio = pct(stats.reposWithDescription, ownedCount);
  const topicsRatio = pct(stats.reposWithTopics, ownedCount);
  const repoCountScore = clamp(logScore(stats.ownedRepos, 15, 5), 0, 5);
  repoQualityScore += Math.round(descRatio * 8) + Math.round(topicsRatio * 7) + repoCountScore;
  repoQualityScore = clamp(repoQualityScore, 0, 20);
  score += repoQualityScore;
  breakdown.push({
    score: repoQualityScore,
    max: 20,
    label: "Repository Quality",
    evidence: `${stats.reposWithDescription}/${stats.ownedRepos} repos have descriptions · ${stats.reposWithTopics}/${stats.ownedRepos} have topics`,
  });
  if (stats.reposWithDescription < Math.ceil(stats.ownedRepos * 0.6)) {
    improvements.push({
      action: `Add descriptions to ${stats.ownedRepos - stats.reposWithDescription} repositories that are missing them`,
      why: "Repository descriptions are shown on your profile page and in search results. Empty descriptions make your work look unfinished.",
      how: "Click the ⚙️ gear icon on each repo → Add Description. Keep it under 100 chars, describe what the project does.",
      points: 6,
      difficulty: "Easy",
      timeMinutes: 10,
      priority: 2,
    });
  }
  if (stats.reposWithTopics < Math.ceil(stats.ownedRepos * 0.5)) {
    improvements.push({
      action: `Add topic tags to ${stats.ownedRepos - stats.reposWithTopics} repositories`,
      why: "Topics make your repos discoverable in GitHub's explore feature and tell recruiters your tech stack instantly.",
      how: "Click ⚙️ gear icon → Topics → Add relevant tags like 'react', 'nodejs', 'javascript', 'portfolio', etc.",
      points: 4,
      difficulty: "Easy",
      timeMinutes: 8,
      priority: 3,
    });
  }

  // ── Bonuses ────────────────────────────────────────────────────────────────
  let bonusScore = 0;
  if (languageDistribution.length >= 3) bonusScore += 2;
  if (stats.ownedRepos >= 5) bonusScore += 2;
  if (profile.accountAgeYears >= 2) bonusScore += 1;
  if (profile.isHireable) bonusScore += 1;
  bonusScore = clamp(bonusScore, 0, 6);

  const finalScore = clamp(score + bonusScore, 20, 100);

  return {
    score: Math.round(finalScore),
    breakdown,
    improvements: improvements.sort((a, b) => a.priority - b.priority),
  };
}

// ─── Documentation Score (0–100) ──────────────────────────────────────────────
export function calculateDocumentationScore(githubData) {
  const { stats, hasProfileReadme } = githubData;
  const breakdown = [];
  const improvements = [];
  let score = 0;

  // 1. Profile README (0–30 pts)
  const readmePts = hasProfileReadme ? 30 : 0;
  score += readmePts;
  breakdown.push({
    score: readmePts, max: 30,
    label: "Profile README",
    evidence: hasProfileReadme ? "✅ Profile README exists" : "❌ Missing — create one for instant credibility",
  });

  // 2. Repo description coverage (0–30 pts)
  const descRatio = pct(stats.reposWithDescription, Math.max(stats.ownedRepos, 1));
  const descPts = Math.round(descRatio * 30);
  score += descPts;
  breakdown.push({
    score: descPts, max: 30,
    label: "Repo Descriptions",
    evidence: `${stats.reposWithDescription}/${stats.ownedRepos} repositories have descriptions (${Math.round(descRatio * 100)}%)`,
  });

  // 3. Topic tags (0–20 pts)
  const topicsRatio = pct(stats.reposWithTopics, Math.max(stats.ownedRepos, 1));
  const topicsPts = Math.round(topicsRatio * 20);
  score += topicsPts;
  breakdown.push({
    score: topicsPts, max: 20,
    label: "Topic Tags",
    evidence: `${stats.reposWithTopics}/${stats.ownedRepos} repositories have topic tags`,
  });

  // 4. README quality estimate (0–15 pts)
  const readmeQualityPts = Math.round((stats.avgReadmeScore / 100) * 15);
  score += readmeQualityPts;
  breakdown.push({
    score: readmeQualityPts, max: 15,
    label: "README Quality",
    evidence: `Estimated README quality score: ${stats.avgReadmeScore}/100 (based on descriptions, topics, and homepage links)`,
  });

  // 5. License usage (0–5 pts)
  const licensePts = stats.reposWithLicense > 0 ? Math.min(5, Math.round(pct(stats.reposWithLicense, Math.max(stats.ownedRepos, 1)) * 5)) : 0;
  score += licensePts;
  breakdown.push({
    score: licensePts, max: 5,
    label: "License Coverage",
    evidence: `${stats.reposWithLicense}/${stats.ownedRepos} repositories have a license`,
  });

  if (descRatio < 0.6) {
    improvements.push({
      action: "Add descriptions to all your repositories",
      why: "Well-documented repos appear in GitHub search and show recruiters you care about your work.",
      how: "Edit each repo's description from the repo homepage. Keep it concise — what does the project do?",
      points: 10,
      difficulty: "Easy",
      timeMinutes: 15,
      priority: 1,
    });
  }

  return {
    score: clamp(Math.round(score), 10, 100),
    breakdown,
    improvements,
  };
}

// ─── Project Quality Score (0–100) ────────────────────────────────────────────
export function calculateProjectQualityScore(githubData) {
  const { stats, topRepos } = githubData;
  const breakdown = [];
  const improvements = [];
  let score = 0;

  if (!topRepos || topRepos.length === 0) {
    return {
      score: 20,
      breakdown: [{ score: 20, max: 100, label: "No Projects", evidence: "No public repositories found" }],
      improvements: [{
        action: "Create your first public project on GitHub",
        why: "Recruiters need to see your code. An empty profile immediately eliminates you from consideration.",
        how: "Start with something small — a todo app, a weather widget, a personal website. Push it to GitHub and add a README.",
        points: 40,
        difficulty: "Medium",
        timeMinutes: 120,
        priority: 1,
      }],
    };
  }

  // 1. Stars quality (0–25 pts)
  const avgStars = stats.totalStars / Math.max(stats.ownedRepos, 1);
  const starsPts = clamp(logScore(avgStars, 5, 25), 0, 25);
  score += starsPts;
  breakdown.push({
    score: starsPts, max: 25,
    label: "Star Quality",
    evidence: `Average ${avgStars.toFixed(1)} stars/repo · Top repo: ${topRepos[0]?.stars || 0} stars`,
  });

  // 2. Project completeness (has description + topics + has homepage) (0–25 pts)
  const completeRepos = topRepos.filter((r) => r.description && r.topics?.length > 0).length;
  const completePts = Math.round(pct(completeRepos, topRepos.length) * 25);
  score += completePts;
  breakdown.push({
    score: completePts, max: 25,
    label: "Project Completeness",
    evidence: `${completeRepos}/${topRepos.length} top repos have both description and topics`,
  });

  // 3. Live demos (homepage links) (0–20 pts)
  const liveRepos = topRepos.filter((r) => r.hasHomepage).length;
  const livePts = Math.round(pct(liveRepos, Math.max(topRepos.length, 1)) * 20);
  score += livePts;
  breakdown.push({
    score: livePts, max: 20,
    label: "Live Deployments",
    evidence: liveRepos > 0
      ? `${liveRepos}/${topRepos.length} projects have live demo links`
      : "None of your top projects have live demo links",
  });

  // 4. Recent activity (0–15 pts)
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const recentRepos = topRepos.filter(
    (r) => r.lastPushed && new Date(r.lastPushed).getTime() > sixtyDaysAgo
  ).length;
  const recentPts = Math.round(pct(recentRepos, Math.max(topRepos.length, 1)) * 15);
  score += recentPts;
  breakdown.push({
    score: recentPts, max: 15,
    label: "Recent Activity",
    evidence: `${recentRepos}/${topRepos.length} top repos updated in last 60 days`,
  });

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
export function calculateHiringReadiness(scores, githubData, portfolioData) {
  const { profile, stats, hasProfileReadme } = githubData;

  // Weighted base (GitHub matters most for hiring readiness)
  const base = portfolioData?.accessible
    ? scores.github * 0.30 + scores.projectQuality * 0.25 + scores.documentation * 0.20 + scores.portfolio * 0.25
    : scores.github * 0.42 + scores.projectQuality * 0.32 + scores.documentation * 0.26;

  // Recruiter-visible bonus signals
  let bonus = 0;
  if (profile?.bio?.length > 10)                  bonus += 5;
  if (profile?.website)                            bonus += 5;
  if (hasProfileReadme)                            bonus += 5;
  if ((stats?.totalStars || 0) >= 10)             bonus += 3;
  if ((stats?.commitCount90Days || 0) >= 15)      bonus += 4;
  if (portfolioData?.checklist?.hasResumeLink?.pass) bonus += 5;
  if (portfolioData?.checklist?.hasLinkedinLink?.pass) bonus += 3;
  if (profile?.location)                           bonus += 2;
  if ((profile?.followers || 0) >= 50)             bonus += 5;
  if ((stats?.ownedRepos || 0) >= 5)              bonus += 3;

  return clamp(Math.round(base + bonus), 20, 100);
}

// ─── Calculate All Scores ──────────────────────────────────────────────────────
export function calculateAllScores(githubData, portfolioData) {
  const githubResult   = calculateGitHubScore(githubData);
  const docResult      = calculateDocumentationScore(githubData);
  const projResult     = calculateProjectQualityScore(githubData);
  const portfolioResult = calculatePortfolioScore(portfolioData);

  const scores = {
    github:         githubResult.score,
    documentation:  docResult.score,
    projectQuality: projResult.score,
    portfolio:      portfolioResult.score,
  };

  const hiringReadiness = calculateHiringReadiness(scores, githubData, portfolioData);

  const hasPortfolio = portfolioData?.accessible;
  const overall = hasPortfolio
    ? Math.round(scores.github * 0.25 + scores.projectQuality * 0.20 + scores.documentation * 0.15 + scores.portfolio * 0.20 + hiringReadiness * 0.20)
    : Math.round(scores.github * 0.35 + scores.projectQuality * 0.25 + scores.documentation * 0.20 + hiringReadiness * 0.20);

  // Merge all improvements, sort by priority then points
  const allImprovements = [
    ...githubResult.improvements,
    ...docResult.improvements,
    ...projResult.improvements,
    ...portfolioResult.improvements,
  ]
    .sort((a, b) => a.priority - b.priority || b.points - a.points)
    .slice(0, 12);

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
    tools:      ["Webpack", "Vite", "Sass", "Tailwind", "Redux"],
    testing:    ["Jest", "Cypress", "Testing Library"],
  },
  backend: {
    core:       ["Node.js", "Python", "Java", "Go", "Rust"],
    frameworks: ["Express", "FastAPI", "Django", "Spring", "NestJS"],
    databases:  ["PostgreSQL", "MySQL", "MongoDB", "Redis"],
    tools:      ["Docker", "REST API", "GraphQL", "JWT", "OAuth"],
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
  aiml: {
    core:       ["Python", "R"],
    frameworks: ["TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy"],
    tools:      ["Jupyter", "Hugging Face", "OpenAI API", "LangChain"],
    cloud:      ["AWS SageMaker", "GCP Vertex AI", "Azure ML"],
  },
};

export function detectMissingSkills(detectedSkills, targetRole) {
  const role = ROLE_SKILLS[targetRole] || ROLE_SKILLS.fullstack;
  const detected = detectedSkills.map((s) => s.toLowerCase());

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

function buildEmptyScore() {
  return { score: 0, breakdown: [], improvements: [] };
}
