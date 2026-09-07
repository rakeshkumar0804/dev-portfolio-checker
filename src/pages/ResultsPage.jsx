import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getReport, uploadResume, analyzeFullProfile } from "../services/apiService.js";
import ScoreGauge from "../components/ScoreGauge.jsx";
import ImprovementCard from "../components/ImprovementCard.jsx";
import RecruiterSimulator from "../components/RecruiterSimulator.jsx";
import CareerRoadmap from "../components/CareerRoadmap.jsx";
import SkillsDetector from "../components/SkillsDetector.jsx";
import LanguageBar from "../components/LanguageBar.jsx";
import ActivityHeatmap from "../components/ActivityHeatmap.jsx";
import RecruiterDecisionCard from "../components/RecruiterDecisionCard.jsx";
import ConsistencyMatrixCard from "../components/ConsistencyMatrixCard.jsx";
import ExecutiveSummaryHero from "../components/ExecutiveSummaryHero.jsx";
import RecruiterSimulationFlow from "../components/RecruiterSimulationFlow.jsx";
import ComparativeBenchmarkCard from "../components/ComparativeBenchmarkCard.jsx";
import RecruiterTimeline from "../components/RecruiterTimeline.jsx";
import ScoreSimulator from "../components/ScoreSimulator.jsx";
import ProgressTimeline from "../components/ProgressTimeline.jsx";
import { sampleReportData } from "../data/sampleReportData.js";
import Icon from "../components/Icon.jsx";

const TABS = [
  { id: "overview",   label: "Overview",            icon: "bar-chart", always: true },
  { id: "github",     label: "GitHub",              icon: "github",    always: true },
  { id: "portfolio",  label: "Portfolio",           icon: "globe",     always: false },
  { id: "insights",   label: "Executive Synthesis", icon: "file-text", always: true },
  { id: "resume",     label: "Resume",              icon: "file-text", always: true },
  { id: "roadmap",    label: "Career Roadmap",      icon: "map",       always: true },
];

const CANONICAL_SKILL_NAMES = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  react: "React",
  "react native": "React Native",
  "react.js": "React",
  reactjs: "React",
  "next.js": "Next.js",
  nextjs: "Next.js",
  next: "Next.js",
  "vue.js": "Vue.js",
  vuejs: "Vue.js",
  vue: "Vue.js",
  angular: "Angular",
  angularjs: "Angular",
  nodejs: "Node.js",
  "node.js": "Node.js",
  node: "Node.js",
  express: "Express",
  "express.js": "Express",
  expressjs: "Express",
  mongodb: "MongoDB",
  mongo: "MongoDB",
  mongoose: "Mongoose",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  sql: "SQL",
  mysql: "MySQL",
  nosql: "NoSQL",
  redis: "Redis",
  python: "Python",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  java: "Java",
  spring: "Spring Boot",
  "spring boot": "Spring Boot",
  springboot: "Spring Boot",
  hibernate: "Hibernate",
  c: "C",
  "c++": "C++",
  "c#": "C#",
  docker: "Docker",
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  aws: "AWS",
  gcp: "Google Cloud",
  azure: "Azure",
  git: "Git",
  github: "GitHub",
  gitlab: "GitLab",
  graphql: "GraphQL",
  "rest api": "REST APIs",
  "rest apis": "REST APIs",
  rest: "REST APIs",
  restful: "REST APIs",
  api: "REST APIs",
  html: "HTML",
  html5: "HTML5",
  css: "CSS",
  css3: "CSS3",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  "tailwind css": "Tailwind CSS",
  sass: "Sass",
  scss: "SCSS",
  redux: "Redux",
  mobx: "MobX",
  zustand: "Zustand",
  jest: "Jest",
  vitest: "Vitest",
  cypress: "Cypress",
  playwright: "Playwright",
  webpack: "Webpack",
  vite: "Vite",
  linux: "Linux",
  bash: "Bash",
  "ci/cd": "CI/CD",
  cicd: "CI/CD",
  terraform: "Terraform",
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  scikit: "Scikit-Learn",
  "scikit-learn": "Scikit-Learn",
  pandas: "Pandas",
  numpy: "NumPy",
  jwt: "JWT",
  oauth: "OAuth",
  ui: "UI/UX",
  ux: "UI/UX",
  context: "React Context",
  hooks: "React Hooks",
};

export function formatDisplayKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];
  const map = new Map();
  const seenDisplay = new Set();

  for (const raw of keywords) {
    if (!raw || typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    // Map common raw keys to canonical equivalents
    let canonicalKey = lower;
    if (lower === "react.js" || lower === "reactjs") canonicalKey = "react";
    if (lower === "node.js" || lower === "nodejs") canonicalKey = "node";
    if (lower === "express.js" || lower === "expressjs") canonicalKey = "express";
    if (lower === "nextjs") canonicalKey = "next.js";
    if (lower === "vuejs") canonicalKey = "vue.js";
    if (lower === "mongodb" || lower === "mongoose") canonicalKey = "mongodb";
    if (lower === "postgres") canonicalKey = "postgresql";
    if (lower === "tailwind" || lower === "tailwindcss") canonicalKey = "tailwind css";
    if (lower === "rest" || lower === "restful" || lower === "api" || lower === "restapi" || lower === "rest apis") canonicalKey = "rest api";
    if (lower === "cicd") canonicalKey = "ci/cd";

    const displayName =
      CANONICAL_SKILL_NAMES[canonicalKey] ||
      CANONICAL_SKILL_NAMES[lower] ||
      (trimmed.length <= 4 && !/[aeiouy]/i.test(trimmed)
        ? trimmed.toUpperCase()
        : trimmed.charAt(0).toUpperCase() + trimmed.slice(1));

    const displayLower = displayName.toLowerCase();
    if (!seenDisplay.has(displayLower) && !map.has(canonicalKey)) {
      seenDisplay.add(displayLower);
      map.set(canonicalKey, displayName);
    }
  }

  return Array.from(map.values());
}

function Card({ title, icon, children, className = "" }) {
  return (
    <div className={`card anim-fade-up ${className}`}>
      <div className="card-header">
        <div className="card-icon">{icon}</div>
        <div>
          <div className="card-title">{title}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function HiringBadge({ rec }) {
  const map = {
    strong_hire: { icon: "star", color: "var(--cyan)", label: "Strong Hire",   desc: "This profile is highly impressive. Recruiters would prioritize this candidate." },
    hire:        { icon: "check", color: "var(--green)", label: "Hire",          desc: "This profile is solid. A recruiter would seriously consider this candidate." },
    maybe:       { icon: "alert-triangle", color: "var(--yellow)", label: "Maybe",         desc: "This profile shows potential but needs targeted improvements to stand out." },
    not_yet:     { icon: "tool", color: "var(--red)", label: "Not Yet",       desc: "This profile needs significant improvements before job applications." },
  };
  const item = map[rec] || map.not_yet;
  return (
    <div className={`hiring-rec-card ${rec}`}>
      <div className="hiring-rec-emoji">
        <Icon name={item.icon} size={24} style={{ color: item.color }} />
      </div>
      <div>
        <div className="hiring-rec-label">Hiring Recommendation</div>
        <div className="hiring-rec-value">{item.label}</div>
        <div className="hiring-rec-desc">{item.desc}</div>
      </div>
    </div>
  );
}

export default function ResultsPage({ isSample = false }) {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const isSampleReport = isSample || shareId === "sample-report" || shareId === "sample";
  const signedIn = Boolean(localStorage.getItem("saas_token"));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalReason, setAuthModalReason] = useState("");
  const [data, setData] = useState(isSampleReport ? sampleReportData : null);
  const [loading, setLoading] = useState(!isSampleReport);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [copyFeedback, setCopyFeedback] = useState({ type: "", message: "" });
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeResult, setResumeResult] = useState(null);
  const [resumeError, setResumeError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  function handleGatedAction(actionType, callback) {
    if (!signedIn) {
      setAuthModalReason("Save your analysis, download PDF reports, track improvements over time, and access your reports anytime.");
      setShowAuthModal(true);
      return;
    }
    if (callback) callback();
  }

  useEffect(() => {
    if (isSampleReport) {
      setData(sampleReportData);
      setLoading(false);
      return;
    }

    const cachedStr = sessionStorage.getItem("portfolioReport");
    if (cachedStr) {
      try {
        const parsed = JSON.parse(cachedStr);
        if (parsed.shareId === shareId) {
          setData(parsed);
          setLoading(false);
          return;
        }
      } catch (_) {}
    }

    setLoading(true);
    getReport(shareId)
      .then((res) => {
        setData(res);
        if (res.fromCache) {
          setFromCache(true);
          setCacheAge(res.cacheAge || 1);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Report not found or expired.");
      })
      .finally(() => setLoading(false));
  }, [shareId, isSampleReport]);

  async function copyLink() {
    let succeeded = false;
    const urlToCopy = isSampleReport
      ? `${window.location.origin}/sample-report`
      : `${window.location.origin}/results/${shareId}`;

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(urlToCopy);
        succeeded = true;
      } catch (_) {
        succeeded = false;
      }
    }

    if (!succeeded) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = urlToCopy;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.top = "-9999px";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        const copyResult = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (copyResult) {
          succeeded = true;
        }
      } catch (_) {
        succeeded = false;
      }
    }

    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);

    if (succeeded) {
      setCopyFeedback({ type: "success", message: "Report link copied" });
      copyTimerRef.current = setTimeout(() => {
        setCopyFeedback({ type: "", message: "" });
      }, 3000);
    } else {
      setCopyFeedback({
        type: "error",
        message: "Couldn’t copy automatically. Copy the URL from your address bar.",
      });
      copyTimerRef.current = setTimeout(() => {
        setCopyFeedback({ type: "", message: "" });
      }, 6000);
    }
  }

  async function handleForceRefresh() {
    if (isSampleReport) {
      setRefreshMsg("ℹ️ Sample report uses fixed demo data. Run a real analysis on the homepage to sync live GitHub data.");
      setTimeout(() => setRefreshMsg(""), 4000);
      return;
    }
    const username = data?.githubData?.profile?.username || data?.githubUsername || data?.githubData?.profile?.login;
    if (!username) return;
    setRefreshing(true);
    setRefreshMsg("");
    try {
      const result = await analyzeFullProfile({
        githubUsername: username,
        portfolioUrl: data?.portfolioData?.url || data?.portfolioUrl || null,
        targetRole: data?.targetRole || "fullstack",
        forceRefresh: true,
      });
      sessionStorage.setItem("portfolioReport", JSON.stringify(result));
      setData(result);
      setFromCache(false);
      setRefreshMsg("✅ Fresh GitHub data synced!");
      setTimeout(() => setRefreshMsg(""), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Refresh failed";
      setRefreshMsg(`⚠️ ${msg}`);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleResumeUpload(e) {
    if (isSampleReport) {
      setResumeError("Sample report uses fixed demo data. Run a real analysis on the homepage to evaluate your own resume.");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    // Reset input so the same file can be re-selected on retry
    e.target.value = "";

    // Validate file type
    const isPdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setResumeError("Only PDF files are accepted for resume upload.");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setResumeError("Resume file size must be less than 5MB.");
      return;
    }

    setResumeUploading(true);
    setResumeError("");
    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("shareId", shareId);
      formData.append("targetRole", data?.targetRole || "fullstack");
      const result = await uploadResume(formData);
      if (result && result.resumeAnalysis) {
        setResumeResult(result.resumeAnalysis);
        setData((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            resumeAnalysis: result.resumeAnalysis,
          };
          try {
            sessionStorage.setItem("portfolioReport", JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
        setActiveTab("resume");
      }
    } catch (err) {
      setResumeError(err.response?.data?.message || "Failed to analyze resume. Please try again.");
    } finally {
      setResumeUploading(false);
    }
  }

  if (loading) {
    return (
      <main className="page-wrap" id="main-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{ textAlign: "center" }} role="status" aria-live="polite">
          <div style={{ marginBottom: 16 }} aria-hidden="true">
            <Icon name="clock" size={48} style={{ color: "var(--cyan)" }} />
          </div>
          <p style={{ color: "var(--txt-2)" }}>Loading your report…</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="page-wrap" id="main-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
        <div className="card" role="alert" aria-live="assertive" style={{ maxWidth: 480, textAlign: "center", padding: "48px 32px" }}>
          <div style={{ marginBottom: 16 }} aria-hidden="true">
            <Icon name="search" size={48} style={{ color: "var(--cyan)" }} />
          </div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 8px" }}>Report Not Available</h1>
          <p style={{ color: "var(--txt-2)", margin: "12px 0 24px" }}>
            {error || "This report does not exist or may have expired."}
          </p>
          <button className="btn-primary" onClick={() => navigate("/")}>
            Run New Analysis →
          </button>
        </div>
      </main>
    );
  }

  const {
    githubData,
    portfolioData,
    resumeAnalysis: baseResume,
    scores,
    scoreBreakdowns,
    improvements,
    aiFeedback,
    missingSkills,
    skillsDetected,
    targetRole,
    recruiterDecision,
    consistencyMatrix,
  } = data;

  const resumeAnalysis = resumeResult || baseResume || null;
  const profile = githubData?.profile || {};
  const stats = githubData?.stats || {};
  const repos = githubData?.topRepos || [];
  const displayName = profile.name || profile.username || "Developer";

  // Determine Source Statuses
  const isGithubAnalyzed = isSampleReport || Boolean(githubData && (githubData.profile || githubData.stats || githubData.topRepos?.length > 0));
  const isPortfolioAnalyzed = isSampleReport || Boolean(portfolioData && portfolioData.accessible);
  const isPortfolioUnavailable = !isSampleReport && Boolean(
    (portfolioData && !portfolioData.accessible) ||
    (!isPortfolioAnalyzed && (data.portfolioUrl || data.analysisMode?.includes("portfolio") || data.analysisMode === "full_360"))
  );
  const hasValidResume = Boolean(
    isSampleReport ||
    (
      resumeAnalysis &&
      (
        (typeof resumeAnalysis.wordCount === "number" && resumeAnalysis.wordCount > 0) ||
        (typeof resumeAnalysis.atsScore === "number" && resumeAnalysis.atsScore > 0 && (
          (Array.isArray(resumeAnalysis.skillsExtracted) && resumeAnalysis.skillsExtracted.length > 0) ||
          (Array.isArray(resumeAnalysis.matchedKeywords) && resumeAnalysis.matchedKeywords.length > 0)
        ))
      )
    )
  );
  const isResumeAnalyzed = hasValidResume;

  const githubStatus = isSampleReport || isGithubAnalyzed ? "analyzed" : (data.githubUsername || data.analysisMode?.includes("github") ? "unavailable" : "not_analyzed");
  const portfolioStatus = isSampleReport || isPortfolioAnalyzed ? "analyzed" : (isPortfolioUnavailable ? "unavailable" : "not_analyzed");
  const resumeStatus = hasValidResume ? "analyzed" : "not_analyzed";

  const showPortfolioTab = portfolioStatus === "analyzed";

  const analyzedSources = isSampleReport
    ? "GitHub, Portfolio, Résumé"
    : [
        githubStatus === "analyzed" ? "GitHub" : null,
        portfolioStatus === "analyzed" ? "Portfolio" : null,
        hasValidResume ? "Résumé" : null,
      ].filter(Boolean).join(", ") || "None";

  const failedSources = [
    githubStatus === "unavailable" ? "GitHub" : null,
    portfolioStatus === "unavailable" ? "Portfolio" : null,
  ].filter(Boolean);

  const overviewResumeBreakdown = hasValidResume && resumeAnalysis
    ? Array.isArray(resumeAnalysis.atsBreakdown)
      ? resumeAnalysis.atsBreakdown
      : resumeAnalysis.atsBreakdown && typeof resumeAnalysis.atsBreakdown === "object"
      ? [
          {
            label: "Role Keyword Match",
            score: resumeAnalysis.atsBreakdown.keywords || 0,
            max: 100,
            evidence: `${(resumeAnalysis.matchedKeywords || []).length} keywords aligned with ${targetRole?.toUpperCase() || "role"}`,
          },
          {
            label: "Action Verbs",
            score: resumeAnalysis.atsBreakdown.actionVerbs || 0,
            max: 100,
            evidence:
              typeof resumeAnalysis.actionVerbCount === "number"
                ? `${resumeAnalysis.actionVerbCount} action verbs identified`
                : resumeAnalysis.hasActionVerbs
                ? "Active verb patterns present"
                : "Lacks strong action verbs",
          },
          {
            label: "Impact Metrics",
            score: resumeAnalysis.atsBreakdown.impactMetrics || 0,
            max: 100,
            evidence:
              typeof resumeAnalysis.quantifiedMetricsCount === "number"
                ? `${resumeAnalysis.quantifiedMetricsCount} quantifiable impact metrics detected`
                : resumeAnalysis.hasMetrics
                ? "Quantifiable results present"
                : "Lacks numerical impact metrics",
          },
          {
            label: "Formatting & Structure",
            score: resumeAnalysis.atsBreakdown.formatting || 0,
            max: 100,
            evidence: "Evaluated section hierarchy and readability",
          },
        ]
      : []
    : [];

  const availableTabs = TABS.filter((t) => {
    if (isSampleReport) return true;
    if (t.id === "overview") return true;
    if (t.id === "github") return githubStatus === "analyzed" || githubStatus === "unavailable";
    if (t.id === "portfolio") return portfolioStatus === "analyzed" || portfolioStatus === "unavailable";
    if (t.id === "insights") return true;
    if (t.id === "resume") return true; // Resume tab must ALWAYS remain visible in every report
    if (t.id === "roadmap") return true;
    return true;
  }).map((t) => {
    let disabled = false;
    let label = t.label;
    if (t.id === "portfolio" && portfolioStatus === "unavailable") {
      disabled = true;
      label = "Portfolio (Unavailable)";
    } else if (t.id === "github" && githubStatus === "unavailable") {
      disabled = true;
      label = "GitHub (Unavailable)";
    }
    // Resume tab label is always exactly "Resume" and never disabled
    return { ...t, disabled, label };
  });

  return (
    <main className="results-page page-wrap" id="main-content">

      {isSampleReport && (
        <div
          className="no-print"
          style={{
            background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(99, 102, 241, 0.06))",
            border: "1px solid rgba(56, 189, 248, 0.28)",
            borderRadius: "14px",
            padding: "12px 20px",
            marginBottom: "20px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Icon name="file-text" size={20} style={{ color: "var(--cyan)" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span
                  className="sample-pill"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "var(--cyan)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                  }}
                >
                  Sample Report
                </span>
                <span style={{ fontWeight: 600, color: "var(--txt-1)", fontSize: "0.9rem" }}>
                  Fictional Demo Candidate
                </span>
              </div>
              <div style={{ color: "var(--txt-2)", fontSize: "0.82rem", marginTop: "2px" }}>
                Viewing pre-generated sample data for illustration. No live APIs or personal data were queried.
              </div>
            </div>
          </div>

          <Link
            to="/"
            className="btn-primary"
            style={{
              padding: "7px 18px",
              fontSize: "0.82rem",
              whiteSpace: "nowrap",
              width: "auto",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Icon name="arrow-left" size={14} /> Run Real Analysis
          </Link>
        </div>
      )}

      {!signedIn && !isSampleReport && (
        <div
          className="no-print"
          style={{
            background: "linear-gradient(135deg, rgba(13, 27, 46, 0.95), rgba(15, 23, 42, 0.95))",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "12px",
            padding: "10px 18px",
            marginBottom: "16px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Icon name="zap" size={20} style={{ color: "var(--cyan)" }} />
            <div>
              <div style={{ fontWeight: 600, color: "var(--txt-1)", fontSize: "0.92rem" }}>
                You’re viewing an instant guest report. Create a free account to save reports, download PDFs, and track progress over time.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setAuthModalReason("Save your analysis, download PDF reports, track improvements over time, and access your reports anytime.");
              setShowAuthModal(true);
            }}
            style={{
              padding: "8px 18px",
              fontSize: "0.85rem",
              whiteSpace: "nowrap",
              width: "auto",
            }}
          >
            Save Report & Create Account →
          </button>
        </div>
      )}

      {/* Header Profile Bar */}
      <div className="results-header card">
        <div className="profile-hero">
          <img
            src={profile.avatar || `https://github.com/${profile.username || "octocat"}.png`}
            alt={displayName}
            className="profile-avatar"
            onError={(e) => {
              e.target.src = "https://github.com/github.png";
            }}
          />
          <div className="profile-info">
            <div className="profile-title-row">
              <h1 className="user-name">{displayName}</h1>
              {recruiterDecision?.overallRecommendation && (
                <span
                  style={{
                    fontSize: "0.78rem",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontWeight: 700,
                    background: recruiterDecision.overallRecommendation === "strong_hire" ? "rgba(52,211,153,0.15)" : "rgba(56,189,248,0.15)",
                    color: recruiterDecision.overallRecommendation === "strong_hire" ? "var(--green)" : "var(--cyan)",
                    border: "1px solid rgba(56,189,248,0.3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Icon name={recruiterDecision.overallRecommendation === "strong_hire" ? "star" : "check"} size={13} />
                  <span>{recruiterDecision.overallRecommendation === "strong_hire" ? "Strong Hire Candidate" : "Hire Candidate"}</span>
                </span>
              )}
            </div>

            <div className="profile-handles">
              {profile.username && (
                <span className="profile-handle">
                  @{profile.username}
                </span>
              )}
              {(() => {
                const knownCount = Number.isInteger(profile.publicRepos)
                  ? profile.publicRepos
                  : Number.isInteger(profile.public_repos)
                  ? profile.public_repos
                  : Number.isInteger(stats.ownedRepos)
                  ? stats.ownedRepos
                  : null;

                if (stats.repoFetchStatus === "unavailable") {
                  if (knownCount !== null && knownCount > 0) {
                    return (
                      <>
                        {profile.username && <span className="meta-separator">•</span>}
                        <span className="profile-handle">
                          {knownCount} Public {knownCount === 1 ? "Repository" : "Repositories"}
                        </span>
                      </>
                    );
                  }
                  return (
                    <>
                      {profile.username && <span className="meta-separator">•</span>}
                      <span className="profile-handle">
                        Repositories unavailable
                      </span>
                    </>
                  );
                }

                const displayCount = stats.ownedRepos !== undefined && stats.ownedRepos !== null
                  ? stats.ownedRepos
                  : knownCount;

                if (displayCount !== null && displayCount !== undefined) {
                  return (
                    <>
                      {profile.username && <span className="meta-separator">•</span>}
                      <span className="profile-handle">
                        {displayCount} Public {displayCount === 1 ? "Repository" : "Repositories"}
                      </span>
                    </>
                  );
                }
                return null;
              })()}
              {profile.bio && (
                <>
                  {(profile.username || stats.ownedRepos !== undefined) && <span className="meta-separator">•</span>}
                  <span className="profile-bio-text">
                    {profile.bio.replace(/^["']+|["']+$/g, "").trim()}
                  </span>
                </>
              )}
            </div>

            <div className="profile-tags">
              {profile.location && (
                <span className="tag tag-location">
                  <Icon name="map" size={12} style={{ marginRight: 5 }} />
                  <span>{profile.location}</span>
                </span>
              )}
              {profile.html_url && (
                <a href={profile.html_url} target="_blank" rel="noreferrer" className="tag tag-link">
                  <Icon name="github" size={13} style={{ marginRight: 5 }} />
                  <span>GitHub</span>
                </a>
              )}
              {portfolioData?.url && (
                <a href={portfolioData.url} target="_blank" rel="noreferrer" className="tag tag-link">
                  <Icon name="globe" size={13} style={{ marginRight: 5 }} />
                  <span>Portfolio</span>
                </a>
              )}
            </div>
          </div>

          <div className="results-header-actions" style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div className="overall-score-badge">
              <div className="overall-score-gauge">
                <svg viewBox="0 0 100 100" className="score-ring-svg">
                  <circle cx="50" cy="50" r="42" className="score-ring-bg" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="score-ring-fill"
                    style={{
                      strokeDasharray: 263.89,
                      strokeDashoffset: 263.89 - (263.89 * (scores.overall || 0)) / 100,
                      stroke: scores.overall >= 85 ? "var(--green)" : scores.overall >= 75 ? "var(--cyan)" : "#f59e0b",
                    }}
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="overall-score-text">
                  <div className="overall-score-number">{scores.overall}</div>
                  <div className="overall-score-label">Overall</div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }} className="no-print">
              <button className="btn-share" onClick={copyLink}>
                <Icon name={copyFeedback.type === "success" ? "check" : "share"} size={14} />
                <span>{copyFeedback.type === "success" ? "Report link copied" : "Share Report"}</span>
              </button>
              <div
                role="status"
                aria-live="polite"
                className="copy-feedback-msg"
                style={{
                  fontSize: "0.75rem",
                  color: copyFeedback.type === "error" ? "var(--yellow)" : "#4ade80",
                  textAlign: "center",
                  display: copyFeedback.message ? "block" : "none",
                  maxWidth: 220,
                  lineHeight: 1.3,
                }}
              >
                {copyFeedback.message}
              </div>
              <button
                className="btn-secondary"
                onClick={() => window.print()}
                style={{ background: "rgba(56, 189, 248, 0.12)", color: "var(--cyan)", border: "1px solid rgba(56, 189, 248, 0.3)" }}
              >
                <Icon name="file-down" size={14} />
                <span>Download / Export PDF</span>
              </button>
              {(isGithubAnalyzed || isSampleReport) && (
                <button
                  className="btn-secondary"
                  disabled={refreshing}
                  onClick={handleForceRefresh}
                  style={{ background: "rgba(52, 211, 153, 0.12)", color: "#34d399", border: "1px solid rgba(52, 211, 153, 0.3)" }}
                >
                  <Icon name="refresh" size={14} />
                  <span>{refreshing ? "Syncing GitHub…" : "Re-sync Live GitHub Data"}</span>
                </button>
              )}
              {refreshMsg && (
                <div style={{ fontSize: "0.75rem", color: refreshMsg.startsWith("✅") ? "#4ade80" : "#f87171", textAlign: "center" }}>
                  {refreshMsg}
                </div>
              )}
              <button
                className="btn-secondary"
                onClick={() => {
                  console.log("🔍 [SAVE DEBUG Step 1] Save button clicked!", { shareId, signedIn, data });
                  if (!signedIn) {
                    console.log("⚠️ [SAVE DEBUG Step 1a] User is not signed in. Opening Auth Modal.");
                    setAuthModalReason("Save your analysis, download PDF reports, track improvements over time, and access your reports anytime.");
                    setShowAuthModal(true);
                  } else {
                    console.log("🚀 [SAVE DEBUG Step 1b] User is signed in. Triggering saveReportToWorkspace...");
                    import("../services/apiService.js").then(({ saveReportToWorkspace }) => {
                      saveReportToWorkspace(shareId, data).then((res) => {
                        console.log("✅ [SAVE DEBUG Step 3] saveReportToWorkspace completed with response:", res);
                        setSavedSuccess(true);
                        setTimeout(() => setSavedSuccess(false), 3000);
                      }).catch((err) => {
                        console.error("❌ [SAVE DEBUG Step 3 Error] saveReportToWorkspace failed:", err);
                      });
                    });
                  }
                }}
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <Icon name={savedSuccess ? "check" : "bookmark"} size={14} />
                <span>{savedSuccess ? "Saved to Workspace!" : "Save Report"}</span>
              </button>
              <Link to="/" className="btn-secondary">
                <Icon name="arrow-left" size={14} />
                <span>New Analysis</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Official Report Audit Metadata Bar */}
      <div
        className="audit-meta-bar"
        style={{
          marginTop: 16,
          padding: "10px 18px",
          background: "rgba(15, 23, 42, 0.8)",
          borderRadius: 12,
          border: "1px solid rgba(56, 189, 248, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          fontSize: "0.78rem",
          color: "#94a3b8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span><Icon name="tag" size={13} style={{ marginRight: 4 }} /><strong>Report Audit Metadata:</strong> {isSampleReport ? "Sample Report (Demo Data)" : "Version v2.4.0"}</span>
          <span><Icon name="search" size={13} style={{ marginRight: 4 }} /><strong>Analyzed sources:</strong> {analyzedSources}{!hasValidResume && !isSampleReport && <span style={{ marginLeft: 6, color: "#94a3b8" }}>(Resume: Not analyzed)</span>}</span>
          <span><Icon name="clock" size={13} style={{ marginRight: 4 }} /><strong>Snapshot Date:</strong> {isSampleReport ? "Fictional Demo Snapshot" : `Live Sync (${new Date().toLocaleDateString()})`}</span>
        </div>
      </div>

      {/* Partial Provider Failure Warning */}
      {failedSources.length > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="partial-failure-banner"
          style={{
            marginTop: 12,
            background: "rgba(234, 179, 8, 0.08)",
            border: "1px solid rgba(234, 179, 8, 0.25)",
            color: "var(--yellow)",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="alert-triangle" size={16} />
          <span>{failedSources.join(" and ")} analysis was unavailable. Your report was generated using the remaining verified sources.</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="results-tabs-wrap no-print">
        <div
          className="results-tabs"
          role="tablist"
          aria-label="Report sections"
        >
          {availableTabs.map((t) => {
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                aria-selected={isSelected}
                aria-controls={`panel-${t.id}`}
                tabIndex={isSelected ? 0 : -1}
                disabled={t.disabled}
                aria-disabled={t.disabled ? "true" : undefined}
                className={`tab-btn ${isSelected ? "active" : ""} ${t.disabled ? "disabled" : ""}`}
                onClick={() => {
                  if (!t.disabled) setActiveTab(t.id);
                }}
                onKeyDown={(e) => {
                  const enabledTabs = availableTabs.filter((tab) => !tab.disabled);
                  const currentIdx = enabledTabs.findIndex((tab) => tab.id === activeTab);
                  let nextTab = null;

                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    const nextIdx = (currentIdx + 1) % enabledTabs.length;
                    nextTab = enabledTabs[nextIdx];
                  } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    const prevIdx = (currentIdx - 1 + enabledTabs.length) % enabledTabs.length;
                    nextTab = enabledTabs[prevIdx];
                  }

                  if (nextTab) {
                    setActiveTab(nextTab.id);
                    const btn = document.getElementById(`tab-${nextTab.id}`);
                    btn?.focus();
                  }
                }}
              >
                <Icon name={t.icon} size={15} style={{ marginRight: 6 }} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENTS */}
      <div className="results-body">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div
            className="tab-content anim-fade-up"
            role="tabpanel"
            id="panel-overview"
            aria-labelledby="tab-overview"
            tabIndex={0}
          >
            <ExecutiveSummaryHero score={scores.overall} recruiterDecision={recruiterDecision} targetRole={targetRole} data={data} />
            <RecruiterDecisionCard recruiterDecision={recruiterDecision} decisionData={recruiterDecision} targetRole={targetRole} />
            <RecruiterSimulationFlow githubData={githubData} portfolioData={portfolioData} resumeAnalysis={resumeAnalysis} recruiterDecision={recruiterDecision} data={data} />
            <ComparativeBenchmarkCard comparative={recruiterDecision?.comparative} targetRole={targetRole} data={data} />
            <RecruiterTimeline githubData={githubData} portfolioData={portfolioData} resumeAnalysis={resumeAnalysis} recruiterDecision={recruiterDecision} data={data} />

            <div className="section-title">
              <h2>Score Gauges by Category</h2>
              <p>Core hiring signals evaluated against senior developer benchmarks</p>
            </div>

            <div className="gauges-grid">
              <ScoreGauge
                score={scores.github}
                status={githubStatus}
                max={100}
                label="GitHub Activity"
                sublabel="Commit cadence, stars & activity"
                breakdown={scoreBreakdowns?.github || []}
              />
              <ScoreGauge
                score={scores.projectQuality}
                status={githubStatus}
                max={100}
                label="Project Engineering"
                sublabel="Live demos & recency"
                breakdown={scoreBreakdowns?.projectQuality || []}
              />
              <ScoreGauge
                score={scores.portfolio}
                status={portfolioStatus}
                max={100}
                label="Portfolio Health"
                sublabel="Response time, SEO metadata, HTTPS & structure"
                breakdown={scoreBreakdowns?.portfolio || []}
              />
              <ScoreGauge
                score={hasValidResume && typeof resumeAnalysis?.atsScore === "number" ? resumeAnalysis.atsScore : 0}
                status={resumeStatus}
                max={100}
                label="ATS Resume Score"
                sublabel={hasValidResume ? "Role alignment & ATS parsing" : "Resume not submitted"}
                breakdown={overviewResumeBreakdown}
              />
            </div>

            <ConsistencyMatrixCard consistencyMatrix={consistencyMatrix} matrix={consistencyMatrix} />

            {/* Top Action Items */}
            <div className="section-title" style={{ marginTop: 40 }}>
              <h2>Top Priority Action Items</h2>
              <p>Highest-impact improvements sorted by point return and difficulty</p>
            </div>

            <div className="improvements-list">
              {improvements && improvements.length > 0 ? (
                improvements.slice(0, 5).map((imp, idx) => (
                  <ImprovementCard key={idx} imp={imp} index={idx} />
                ))
              ) : recruiterDecision?.redFlags?.length > 0 ? (
                <div className="info-box" style={{ background: "rgba(234, 179, 8, 0.08)", border: "1px solid rgba(234, 179, 8, 0.2)", color: "var(--yellow)", padding: "16px 20px", borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 4 }}>
                    <Icon name="alert-triangle" size={16} style={{ color: "var(--yellow)" }} />
                    <span>Profile gaps detected in recruiter screening</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--txt-2)" }}>
                    Review the Critical Hiring Risks identified in the Recruiter Decision Engine above to address outstanding profile gaps.
                  </p>
                </div>
              ) : scores?.overall < 85 ? (
                <div className="info-box" style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", color: "var(--cyan)", padding: "16px 20px", borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 4 }}>
                    <Icon name="info" size={16} style={{ color: "var(--cyan)" }} />
                    <span>No automated task items generated</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--txt-2)" }}>
                    No automated action recommendations were returned for this evaluation scope. Review individual category breakdowns above.
                  </p>
                </div>
              ) : (
                <p style={{ color: "var(--txt-2)" }}>
                  No high-priority improvements required. Profile meets established benchmarks across all evaluated sources.
                </p>
              )}
            </div>
          </div>
        )}

        {/* GITHUB TAB */}
        {activeTab === "github" && (
          <div
            className="tab-content anim-fade-up"
            role="tabpanel"
            id="panel-github"
            aria-labelledby="tab-github"
            tabIndex={0}
          >
            {isGithubAnalyzed ? (
              <>
                <ScoreSimulator currentScore={scores.overall} initialScore={scores.overall} improvements={improvements} recruiterDecision={recruiterDecision} />
                <ProgressTimeline githubUsername={displayName} currentUsername={displayName} currentScore={scores.overall} />

                <div className="two-col-grid" style={{ marginBottom: 24 }}>
                  <Card title="GitHub Stats" icon={<Icon name="bar-chart" size={18} />}>
                    <div className="stat-rows">
                      <div className="stat-row">
                        <span>Public Repositories</span>
                        <strong>
                          {(() => {
                            const knownCount = Number.isInteger(profile.publicRepos)
                              ? profile.publicRepos
                              : Number.isInteger(profile.public_repos)
                              ? profile.public_repos
                              : Number.isInteger(stats.ownedRepos)
                              ? stats.ownedRepos
                              : null;

                            if (stats.repoFetchStatus === "unavailable") {
                              return knownCount !== null && knownCount > 0
                                ? `${knownCount} (Details unavailable)`
                                : "Unavailable";
                            }
                            if (stats.ownedRepos !== undefined && stats.ownedRepos !== null) {
                              return stats.ownedRepos;
                            }
                            return knownCount !== null ? knownCount : "Unavailable";
                          })()}
                        </strong>
                      </div>
                      <div className="stat-row">
                        <span>Total Stars Earned</span>
                        <strong>{stats.totalStars || 0} stars</strong>
                      </div>
                      <div className="stat-row">
                        <span>{stats.ownedRepos > 0 ? "90-Day Commit Cadence" : "Contribution Activity"}</span>
                        <strong>{stats.commitCount90Days || 0} {stats.ownedRepos > 0 ? "commits" : "contributions (past 90 days)"}</strong>
                      </div>
                      <div className="stat-row">
                        <span>Active Streak</span>
                        <strong>{stats.currentStreak || 0} days</strong>
                      </div>
                      <div className="stat-row">
                        <span>Followers</span>
                        <strong>{profile.followers || 0}</strong>
                      </div>
                    </div>
                  </Card>

                  <Card title="Language Distribution" icon={<Icon name="code" size={18} />}>
                    <LanguageBar languages={githubData?.languageDistribution || []} />
                  </Card>
                </div>

                <Card title={stats.ownedRepos > 0 ? "90-Day Commit Heatmap" : "Activity Heatmap"} icon={<Icon name="calendar" size={18} />} className="mb-24">
                  <ActivityHeatmap weeks={githubData?.commitActivityWeeks || []} weeklyActivity={githubData?.stats?.weeklyActivity || githubData?.commitActivityWeeks || []} />
                </Card>

                <div className="section-title">
                  <h2>GitHub Category Score Breakdown</h2>
                </div>
                <div className="breakdown-cards">
                  {(scoreBreakdowns?.github || []).map((b, idx) => (
                    <div key={idx} className="breakdown-card card">
                      <div className="breakdown-header">
                        <span className="breakdown-label">{b.label}</span>
                        <span className="breakdown-score">{b.score} / {b.max}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.round((b.score / b.max) * 100)}%` }} />
                      </div>
                      <div className="breakdown-evidence">{b.evidence}</div>
                    </div>
                  ))}
                </div>

                <div className="section-title" style={{ marginTop: 32 }}>
                  <h2>Top Evaluated Repositories ({repos.length})</h2>
                </div>
                {repos.length > 0 ? (
                  <div className="repos-grid">
                    {repos.map((repo, idx) => (
                      <a
                        key={idx}
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="repo-card card card-hover-link"
                        style={{ textDecoration: "none", color: "inherit", display: "block" }}
                      >
                        <div className="repo-header">
                          <span className="repo-name">{repo.name}</span>
                          <span className="repo-stars">⭐ {repo.stars}</span>
                        </div>
                        <p className="repo-desc">{repo.description || "No description provided."}</p>
                        <div className="repo-meta">
                          {repo.language && <span className="tag">{repo.language}</span>}
                          {repo.hasHomepage && <span className="tag green-tag">Live Demo</span>}
                          {repo.hasReadme && <span className="tag cyan-tag">README</span>}
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--txt-3)", fontStyle: "italic", marginTop: 8 }}>
                    {stats.repoFetchStatus === "unavailable"
                      ? "Repository details could not be retrieved from GitHub at this time."
                      : "No public repositories found for this account."}
                  </p>
                )}
              </>
            ) : (
              <Card title="GitHub Not Analyzed" icon={<Icon name="github" size={18} />}>
                <p style={{ color: "var(--txt-2)" }}>
                  This report was generated without GitHub profile data. Submit a GitHub username to audit commit cadence, repository engineering, and code consistency.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* PORTFOLIO TAB */}
        {activeTab === "portfolio" && (
          <div
            className="tab-content anim-fade-up"
            role="tabpanel"
            id="panel-portfolio"
            aria-labelledby="tab-portfolio"
            tabIndex={0}
          >
            {isPortfolioAnalyzed && portfolioData ? (
              <>
                <Card title="Portfolio Health & Structural Checklist" icon={<Icon name="globe" size={18} />} className="mb-24">
                  <div className="portfolio-url-bar">
                    <span className="portfolio-url-label">URL Evaluated:</span>
                    <a href={portfolioData.url} target="_blank" rel="noreferrer">
                      {portfolioData.url} ↗
                    </a>
                  </div>
                </Card>

                <div className="section-title">
                  <h2>Portfolio Score Breakdown</h2>
                </div>
                <div className="breakdown-cards">
                  {(scoreBreakdowns?.portfolio || []).map((b, idx) => (
                    <div key={idx} className="breakdown-card card">
                      <div className="breakdown-header">
                        <span className="breakdown-label">{b.label}</span>
                        <span className="breakdown-score">{b.score} / {b.max}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.round((b.score / b.max) * 100)}%` }} />
                      </div>
                      <div className="breakdown-evidence">{b.evidence}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Card title="Portfolio Unavailable" icon={<Icon name="globe" size={18} />}>
                <p style={{ color: "var(--txt-2)" }}>
                  Portfolio website analysis was unavailable for this report. Please verify that the portfolio link is publicly reachable via HTTP/HTTPS.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* EXECUTIVE SYNTHESIS TAB */}
        {activeTab === "insights" && (
          <div
            className="tab-content anim-fade-up"
            role="tabpanel"
            id="panel-insights"
            aria-labelledby="tab-insights"
            tabIndex={0}
          >
            <Card title="Executive Recruiter Synthesis" icon={<Icon name="file-text" size={18} />} className="mb-24">
              <div className="ai-feedback-box">
                <p style={{ whiteSpace: "pre-line", lineHeight: 1.7, fontSize: "0.95rem" }}>
                  {typeof aiFeedback === "string"
                    ? aiFeedback
                    : aiFeedback?.overallSummary || "Synthesis feedback unavailable for this report."}
                </p>
              </div>
            </Card>

            <SkillsDetector missingSkills={missingSkills} skillsDetected={skillsDetected} targetRole={targetRole} />
          </div>
        )}

        {/* RESUME TAB */}
        {activeTab === "resume" && (
          <div
            className="tab-content anim-fade-up"
            role="tabpanel"
            id="panel-resume"
            aria-labelledby="tab-resume"
            tabIndex={0}
          >
            {!hasValidResume ? (
              <div>
                <Card title="Upload Resume PDF for ATS Evaluation" icon={<Icon name="file-text" size={18} />} className="mb-24">
                  <p style={{ color: "var(--txt-2)", marginBottom: 16, fontSize: "0.92rem", lineHeight: 1.5 }}>
                    No resume was uploaded for this analysis. Upload a PDF to calculate ATS score, resume metrics, keywords, and resume evidence.
                  </p>

                  <div
                    className="resume-upload-zone"
                    style={{
                      border: "2px dashed var(--border)",
                      padding: 24,
                      borderRadius: 12,
                      textAlign: "center",
                      background: "rgba(15, 23, 42, 0.4)",
                    }}
                  >
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleResumeUpload}
                      id="res-tab-file"
                      style={{ display: "none" }}
                    />
                    <label
                      htmlFor="res-tab-file"
                      className="btn-primary"
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      {resumeUploading ? (
                        "Parsing Resume PDF…"
                      ) : (
                        <>
                          <Icon name="file-text" size={15} /> Choose Resume PDF
                        </>
                      )}
                    </label>
                    {resumeError && (
                      <div className="error-banner" role="alert" aria-live="assertive" style={{ marginTop: 16 }}>
                        {resumeError}
                      </div>
                    )}
                  </div>
                </Card>

                <div className="two-col-grid mb-24">
                  <ScoreGauge
                    score={0}
                    status="not_analyzed"
                    max={100}
                    label="ATS Match Score"
                    sublabel={targetRole ? `Target Role: ${targetRole.toUpperCase()}` : "Target Role"}
                    breakdown={[]}
                  />
                  <Card title="Resume Metrics" icon={<Icon name="bar-chart" size={18} />}>
                    <div className="stat-rows">
                      <div className="stat-row">
                        <span>Word Count</span>
                        <strong style={{ color: "var(--txt-3)" }}>Not analyzed</strong>
                      </div>
                      <div className="stat-row">
                        <span>Quantified Metrics Found</span>
                        <strong style={{ color: "var(--txt-3)" }}>Not analyzed</strong>
                      </div>
                      <div className="stat-row">
                        <span>Action Verbs</span>
                        <strong style={{ color: "var(--txt-3)" }}>Not analyzed</strong>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="section-title">
                  <h2>Resume ATS Keyword Analysis</h2>
                </div>

                <div className="two-col-grid mb-24">
                  <Card
                    title="Keywords Found"
                    icon={<Icon name="check-circle" size={18} style={{ color: "var(--txt-3)" }} />}
                  >
                    <p style={{ color: "var(--txt-3)", fontSize: "0.85rem", margin: "6px 0" }}>
                      Not analyzed — upload a resume PDF to detect technical keywords
                    </p>
                  </Card>
                  <Card
                    title="Missing High-Impact Keywords"
                    icon={<Icon name="alert-triangle" size={18} style={{ color: "var(--txt-3)" }} />}
                  >
                    <p style={{ color: "var(--txt-3)", fontSize: "0.85rem", margin: "6px 0" }}>
                      Not analyzed — upload a resume PDF to identify keyword gaps
                    </p>
                  </Card>
                </div>
              </div>
            ) : (
              (() => {
                const detectedKeywords = formatDisplayKeywords(
                  Array.from(
                    new Set([
                      ...(resumeAnalysis.matchedKeywords || []),
                      ...(resumeAnalysis.skillsExtracted || []),
                    ])
                  ).filter(Boolean)
                );

                const missingKeywordsList = formatDisplayKeywords(
                  (resumeAnalysis.missingKeywords || []).filter(Boolean)
                );

                const resumeBreakdown = Array.isArray(resumeAnalysis.atsBreakdown)
                  ? resumeAnalysis.atsBreakdown
                  : resumeAnalysis.atsBreakdown && typeof resumeAnalysis.atsBreakdown === "object"
                  ? [
                      {
                        label: "Role Keyword Match",
                        score: resumeAnalysis.atsBreakdown.keywords || 0,
                        max: 100,
                        evidence: `${detectedKeywords.length} technical skills aligned with ${targetRole?.toUpperCase() || "role"}`,
                      },
                      {
                        label: "Action Verbs",
                        score: resumeAnalysis.atsBreakdown.actionVerbs || 0,
                        max: 100,
                        evidence:
                          typeof resumeAnalysis.actionVerbCount === "number"
                            ? `${resumeAnalysis.actionVerbCount} action verbs identified`
                            : resumeAnalysis.hasActionVerbs
                            ? "Active verb patterns present"
                            : "Lacks strong action verbs",
                      },
                      {
                        label: "Impact Metrics",
                        score: resumeAnalysis.atsBreakdown.impactMetrics || 0,
                        max: 100,
                        evidence:
                          typeof resumeAnalysis.quantifiedMetricsCount === "number"
                            ? `${resumeAnalysis.quantifiedMetricsCount} quantifiable impact metrics detected`
                            : resumeAnalysis.hasMetrics
                            ? "Quantifiable results present"
                            : "Lacks numerical impact metrics",
                      },
                      {
                        label: "Formatting & Structure",
                        score: resumeAnalysis.atsBreakdown.formatting || 0,
                        max: 100,
                        evidence: "Evaluated section hierarchy and readability",
                      },
                    ]
                  : [];

                return (
                  <div>
                    <div className="two-col-grid mb-24">
                      <ScoreGauge
                        score={typeof resumeAnalysis.atsScore === "number" ? resumeAnalysis.atsScore : 0}
                        status={resumeStatus}
                        max={100}
                        label="ATS Match Score"
                        sublabel={`Target Role: ${targetRole?.toUpperCase()}`}
                        breakdown={resumeBreakdown}
                      />
                      <Card title="Resume Metrics" icon={<Icon name="bar-chart" size={18} />}>
                        <div className="stat-rows">
                          <div className="stat-row">
                            <span>Word Count</span>
                            <strong>
                              {typeof resumeAnalysis.wordCount === "number" && resumeAnalysis.wordCount > 0
                                ? `${resumeAnalysis.wordCount} words`
                                : "Not available"}
                            </strong>
                          </div>
                          <div className="stat-row">
                            <span>Quantified Metrics Found</span>
                            <strong>
                              {typeof resumeAnalysis.quantifiedMetricsCount === "number"
                                ? `${resumeAnalysis.quantifiedMetricsCount} metrics`
                                : typeof resumeAnalysis.hasMetrics === "boolean"
                                ? resumeAnalysis.hasMetrics
                                  ? "Detected in resume"
                                  : "None detected"
                                : "Not available"}
                            </strong>
                          </div>
                          <div className="stat-row">
                            <span>Action Verbs</span>
                            <strong>
                              {typeof resumeAnalysis.actionVerbCount === "number"
                                ? `${resumeAnalysis.actionVerbCount} verbs`
                                : typeof resumeAnalysis.hasActionVerbs === "boolean"
                                ? resumeAnalysis.hasActionVerbs
                                  ? "Detected in resume"
                                  : "None detected"
                                : "Not available"}
                            </strong>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <div className="section-title">
                      <h2>Resume ATS Keyword Analysis</h2>
                    </div>

                    <div className="two-col-grid mb-24">
                      <Card title="Keywords Found" icon={<Icon name="check-circle" size={18} style={{ color: "var(--green)" }} />}>
                        {detectedKeywords.length > 0 ? (
                          <div className="skills-tags">
                            {detectedKeywords.map((k, i) => (
                              <span key={i} className="skill-tag detected-tag">
                                {k}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: "var(--txt-3)", fontSize: "0.85rem", margin: "6px 0" }}>
                            No technical keywords detected
                          </p>
                        )}
                      </Card>
                      <Card title="Missing High-Impact Keywords" icon={<Icon name="alert-triangle" size={18} style={{ color: "var(--yellow)" }} />}>
                        {missingKeywordsList.length > 0 ? (
                          <div className="skills-tags">
                            {missingKeywordsList.map((k, i) => (
                              <span key={i} className="skill-tag missing-tag">
                                + {k}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: "var(--txt-3)", fontSize: "0.85rem", margin: "6px 0" }}>
                            No critical keywords missing
                          </p>
                        )}
                      </Card>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* ROADMAP TAB */}
        {activeTab === "roadmap" && (
          <div
            className="tab-content anim-fade-up"
            role="tabpanel"
            id="panel-roadmap"
            aria-labelledby="tab-roadmap"
            tabIndex={0}
          >
            <CareerRoadmap
              improvements={improvements}
              targetRole={targetRole}
              roadmap={data?.careerRoadmap || data?.roadmap || data?.aiFeedback?.careerRoadmap || null}
            />
          </div>
        )}
      </div>

      {/* Auth Modal Triggered by Guest Actions */}
      {showAuthModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(2, 8, 16, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowAuthModal(false)}
        >
          <div
            className="card anim-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 440,
              width: "100%",
              background: "#0b1729",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "16px",
              padding: "28px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <Icon name="trending-up" size={40} style={{ color: "var(--cyan)" }} />
            </div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>
              Unlock Your Developer Workspace
            </h3>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.5, margin: "0 0 20px" }}>
              {authModalReason || "Create a free workspace account to save reports, download PDFs, and track career score growth over time."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setShowAuthModal(false);
                  navigate("/auth");
                }}
                style={{ width: "100%", padding: "12px", fontSize: "0.9rem" }}
              >
                Create Free Workspace →
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowAuthModal(false);
                  navigate("/auth");
                }}
                style={{ width: "100%", padding: "10px", fontSize: "0.85rem" }}
              >
                Sign In to Existing Account
              </button>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--txt-3)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  marginTop: "6px",
                }}
              >
                Continue Previewing Guest Report
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
