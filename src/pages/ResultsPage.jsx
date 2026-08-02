import { useEffect, useState } from "react";
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

const TABS = [
  { id: "overview",   label: "📊 Overview",            always: true },
  { id: "github",     label: "🐙 GitHub",               always: true },
  { id: "portfolio",  label: "🌐 Portfolio",             always: false },
  { id: "insights",   label: "📝 Executive Synthesis",  always: true },
  { id: "resume",     label: "📄 Resume",                always: true },
  { id: "roadmap",    label: "🗺 Career Roadmap",        always: true },
];

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
    strong_hire: { emoji: "🌟", label: "Strong Hire",   desc: "This profile is highly impressive. Recruiters would prioritize this candidate." },
    hire:        { emoji: "✅", label: "Hire",          desc: "This profile is solid. A recruiter would seriously consider this candidate." },
    maybe:       { emoji: "⚡", label: "Maybe",         desc: "This profile shows potential but needs targeted improvements to stand out." },
    not_yet:     { emoji: "🔧", label: "Not Yet",       desc: "This profile needs significant improvements before job applications." },
  };
  const item = map[rec] || map.not_yet;
  return (
    <div className={`hiring-rec-card ${rec}`}>
      <div className="hiring-rec-emoji">{item.emoji}</div>
      <div>
        <div className="hiring-rec-label">Hiring Recommendation</div>
        <div className="hiring-rec-value">{item.label}</div>
        <div className="hiring-rec-desc">{item.desc}</div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const signedIn = Boolean(localStorage.getItem("saas_token"));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalReason, setAuthModalReason] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);
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
    const cached = sessionStorage.getItem("portfolioReport");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.shareId === shareId) {
          setData(parsed);
          if (parsed.fromCache) { setFromCache(true); setCacheAge(parsed.cacheAge || 0); }
          if (parsed.resumeAnalysis) setResumeResult(parsed.resumeAnalysis);
          setLoading(false);
          sessionStorage.removeItem("portfolioReport");
          return;
        }
      } catch (_) {}
    }
    getReport(shareId)
      .then((r) => {
        setData(r);
        if (r.fromCache) { setFromCache(true); setCacheAge(r.cacheAge || 0); }
        if (r.resumeAnalysis) setResumeResult(r.resumeAnalysis);
      })
      .catch(() => setError("Report not found or expired."))
      .finally(() => setLoading(false));
  }, [shareId]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleForceRefresh() {
    if (!data?.githubData?.profile?.username) return;
    setRefreshing(true);
    setRefreshMsg("");
    try {
      const result = await analyzeFullProfile({
        githubUsername: data.githubData.profile.username,
        portfolioUrl: data.portfolioData?.url || null,
        targetRole: data.targetRole || "fullstack",
        forceRefresh: true,
      });
      sessionStorage.setItem("portfolioReport", JSON.stringify(result));
      setData(result);
      setFromCache(false);
      setRefreshMsg("✅ Fresh data loaded!");
      setTimeout(() => setRefreshMsg(""), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Refresh failed";
      setRefreshMsg(`⚠️ ${msg}`);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleResumeUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setResumeUploading(true);
    setResumeError("");
    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("shareId", shareId);
      formData.append("targetRole", data?.targetRole || "fullstack");
      const result = await uploadResume(formData);
      setResumeResult(result.resumeAnalysis);
      setActiveTab("resume");
    } catch (err) {
      setResumeError(err.response?.data?.message || "Failed to analyze resume");
    } finally {
      setResumeUploading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>⏳</div>
          <p style={{ color: "var(--txt-2)" }}>Loading your report…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>😕</div>
          <h2 style={{ marginBottom: 8 }}>Report Not Found</h2>
          <p style={{ color: "var(--txt-2)", marginBottom: 24 }}>{error || "This report may have expired."}</p>
          <Link to="/" className="btn-primary" style={{ display: "inline-flex", width: "auto", padding: "12px 24px", textDecoration: "none" }}>
            ← Analyze Another Profile
          </Link>
        </div>
      </div>
    );
  }

  const githubData = data?.githubData || null;
  const portfolioData = data?.portfolioData || null;
  const scores = data?.scores || { overall: 0, github: 0, projectQuality: 0, documentation: 0, portfolio: 0, hiringReadiness: 0 };
  const scoreBreakdowns = data?.scoreBreakdowns || {};
  const improvements = data?.improvements || [];
  const aiFeedback = data?.aiFeedback || null;
  const missingSkills = data?.missingSkills || [];
  const skillsDetected = data?.skillsDetected || [];
  const targetRole = data?.targetRole || "fullstack";

  const profile = githubData?.profile || {};
  const stats = githubData?.stats || {};
  const languageDistribution = githubData?.languageDistribution || [];
  const topRepos = githubData?.topRepos || [];
  const hasProfileReadme = githubData?.hasProfileReadme || false;

  const shareUrl = `${window.location.origin}/results/${shareId}`;

  const hasGithub = !!(githubData && githubData.profile);
  const hasPortfolio = !!(portfolioData && portfolioData.accessible);

  const visibleTabs = TABS.filter((t) => {
    if (t.id === "github") return hasGithub;
    if (t.id === "portfolio") return hasPortfolio;
    return true;
  });

  return (
    <div className="results-page">
      {/* Anonymous Guest Conversion Banner */}
      {!signedIn && (
        <div style={{
          maxWidth: 1100, margin: "0 auto 20px",
          background: "linear-gradient(90deg, rgba(14, 165, 233, 0.12) 0%, rgba(167, 139, 250, 0.12) 100%)",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          borderRadius: 12,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justify: "space-between",
          gap: 16,
          flexWrap: "wrap",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.2rem" }}>✨</span>
            <span style={{ fontSize: "0.85rem", color: "var(--txt-1)", fontWeight: 500 }}>
              You're viewing an instant guest report. Create a free account to save reports, download PDFs, and track progress over time.
            </span>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ width: "auto", padding: "7px 16px", fontSize: "0.8rem" }}
            onClick={() => handleGatedAction("save")}
          >
            Save Report & Create Account →
          </button>
        </div>
      )}

      {/* Profile Header */}
      <div className="results-header">
        <div className="results-header-inner">
          <div className="user-identity">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name || "User"} className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">{profile.name?.[0] || profile.username?.[0] || "👤"}</div>
            )}
            <div>
              <h1 className="user-name">{profile.name || profile.username || (portfolioData?.url ? "Portfolio Audit" : "Developer Candidate")}</h1>
              <p className="user-bio">
                {hasGithub ? `@${profile.username} · ${profile.publicRepos ?? stats.ownedRepos ?? 0} Public Repositories${profile.bio ? ` — "${profile.bio}"` : ""}` : `Target Role: ${(targetRole || "fullstack").toUpperCase()}`}
              </p>
              <div className="user-links">
                {profile.location && <span style={{ fontSize: "0.78rem", color: "var(--txt-3)" }}>📍 {profile.location}</span>}
                {profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="user-link">🐙 GitHub</a>}
                {portfolioData?.url && <a href={portfolioData.url} target="_blank" rel="noreferrer" className="user-link">🌐 Portfolio</a>}
              </div>
            </div>
          </div>

          {/* Overall Score & Print Report */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div className="overall-score-block">
              <div className="overall-score-ring-wrap">
                <svg width="110" height="110" viewBox="0 0 110 110">
                  <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle
                    cx="55" cy="55" r="46"
                    fill="none"
                    stroke="url(#overallGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 46}`}
                    strokeDashoffset={`${2 * Math.PI * 46 * (1 - scores.overall / 100)}`}
                    style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1.5s ease" }}
                  />
                  <defs>
                    <linearGradient id="overallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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
                {copied ? "✅ Copied!" : "🔗 Share Report"}
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleGatedAction("pdf", () => window.print())}
                style={{ background: "rgba(56, 189, 248, 0.12)", color: "var(--cyan)", border: "1px solid rgba(56, 189, 248, 0.3)" }}
              >
                📄 Download / Export PDF
              </button>
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
                {savedSuccess ? "✅ Saved to Workspace!" : "💾 Save Report"}
              </button>
              <Link to="/" className="btn-secondary">← New Analysis</Link>
            </div>
          </div>
        </div>

        {/* Official Report Audit Metadata Bar */}
        <div
          style={{
            marginTop: 16,
            padding: "10px 18px",
            background: "rgba(15, 23, 42, 0.8)",
            borderRadius: 12,
            border: "1px solid rgba(56, 189, 248, 0.2)",
            display: "flex",
            justify: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            fontSize: "0.78rem",
            color: "var(--txt-2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ color: "var(--cyan)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <span>🏷️</span> Report Audit Metadata:
            </span>
            <span style={{ background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 6, color: "var(--txt-1)" }}>
              Version v2.4.0
            </span>
            <span style={{ background: "rgba(56, 189, 248, 0.1)", padding: "3px 8px", borderRadius: 6, color: "var(--cyan)" }}>
              Evidence-Based Scoring Engine v4.2
            </span>
          </div>

          <div style={{ color: "var(--txt-3)", fontSize: "0.75rem" }}>
            🕒 Snapshot Date: <strong style={{ color: "var(--txt-2)" }}>Live GitHub Sync ({new Date().toLocaleDateString()})</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="results-tabs-wrap">
        <div className="results-tabs">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === "resume" && resumeResult && (
                <span style={{ fontSize: "0.65rem", padding: "2px 6px", background: "rgba(52,211,153,0.12)", color: "var(--green)", borderRadius: 10, marginLeft: 4 }}>
                  Done
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="results-body">
        {fromCache && (
          <div className="cache-notice" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              ♻️ Cached results from <strong style={{ marginLeft: 4 }}>{cacheAge} minutes ago</strong> — auto-refreshes after 5 mins.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {refreshMsg && <span style={{ fontSize: "0.8rem", color: "var(--txt-2)" }}>{refreshMsg}</span>}
              <button
                className="btn-secondary"
                onClick={handleForceRefresh}
                disabled={refreshing}
                style={{ padding: "6px 14px", fontSize: "0.8rem", cursor: refreshing ? "not-allowed" : "pointer" }}
              >
                {refreshing ? "⏳ Refreshing…" : "🔄 Force Refresh"}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: OVERVIEW ── */}
        {activeTab === "overview" && (
          <>
            {/* SECTION 1: Executive Summary & Re-designed Score Hero */}
            <ExecutiveSummaryHero
              score={scores.overall}
              recruiterDecision={data?.recruiterDecision}
              targetRole={targetRole}
            />

            {/* Audit Progression & Score History Timeline */}
            <ProgressTimeline currentScore={scores.overall} currentUsername={profile.username} />

            {/* Interactive "What If?" Score Simulator */}
            <ScoreSimulator
              initialScore={scores.overall}
              improvements={improvements}
              recruiterDecision={data?.recruiterDecision}
            />

            {/* SECTION 2: 10-Second Recruiter Audit Checklist */}
            <RecruiterTimeline
              githubData={githubData}
              portfolioData={portfolioData}
              resumeAnalysis={data?.resumeAnalysis}
              recruiterDecision={data?.recruiterDecision}
            />

            {/* SECTION 3: Deterministic Seniority Benchmarks */}
            <ComparativeBenchmarkCard
              comparative={data?.recruiterDecision?.comparative}
              targetRole={targetRole}
            />

            {/* SECTION 4: Resume ↔ GitHub Skill Audit Matrix */}
            {data?.consistencyMatrix && (
              <ConsistencyMatrixCard matrix={data.consistencyMatrix} />
            )}

            {/* SECTION 5: Health Scores */}
            <Card title="Section 5: Dimension Health Scores" icon="📊">
              <div style={{ marginBottom: 16, fontSize: "0.82rem", color: "var(--txt-3)" }}>
                Click any score card to see the exact evidence behind it ↓
              </div>
              <div className="scores-grid">
                {hasGithub && <ScoreGauge score={scores.github}         label="GitHub Profile"   breakdown={scoreBreakdowns?.github || []} />}
                {hasGithub && <ScoreGauge score={scores.projectQuality} label="Project Quality"  breakdown={scoreBreakdowns?.projectQuality || []} />}
                {hasGithub && <ScoreGauge score={scores.documentation}  label="Documentation"    breakdown={scoreBreakdowns?.documentation || []} />}
                {hasPortfolio && <ScoreGauge score={scores.portfolio}      label="Portfolio"         breakdown={scoreBreakdowns?.portfolio || []} />}
                <ScoreGauge score={scores.hiringReadiness} label="Hiring Readiness" breakdown={[]} />
              </div>
              {!hasPortfolio && (
                <div className="info-box" style={{ marginTop: 16 }}>
                  💡 Add a portfolio URL in a new analysis to unlock full Portfolio audit & Vitals checks.
                </div>
              )}
            </Card>

            {aiFeedback?.hiringRecommendation && (
              <HiringBadge rec={aiFeedback.hiringRecommendation} />
            )}

            {improvements?.length > 0 && (
              <Card title="Section 6: Highest Impact Improvements" icon="⚡">
                <div style={{ marginBottom: 16, fontSize: "0.85rem", color: "var(--txt-2)" }}>
                  Highest-impact actions sorted by points gained vs effort required.
                </div>
                <div className="improvements-list">
                  {improvements.slice(0, 3).map((item, i) => (
                    <ImprovementCard key={i} item={item} index={i} />
                  ))}
                </div>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 16, width: "100%", justifyContent: "center" }}
                  onClick={() => setActiveTab("insights")}
                >
                  See All {improvements.length} Improvements →
                </button>
              </Card>
            )}

            {aiFeedback?.overallSummary && (
              <Card title="AI Summary" icon="✨">
                <div className="ai-summary-box">{aiFeedback.overallSummary}</div>
                {aiFeedback.topPriority && (
                  <div style={{ padding: "12px 16px", borderRadius: "var(--r-md)", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", fontSize: "0.88rem", color: "var(--red)" }}>
                    🎯 <strong>Top Priority:</strong> {aiFeedback.topPriority}
                  </div>
                )}
              </Card>
            )}
          </>
        )}

        {/* ── TAB: GITHUB ── */}
        {activeTab === "github" && (
          <>
            <Card title="GitHub Stats" icon="📈">
              <div className="stats-row">
                {[
                  { value: stats.totalRepos,        label: "Total Repos" },
                  { value: stats.ownedRepos,         label: "Owned Repos" },
                  { value: stats.totalStars,         label: "Total Stars ⭐" },
                  { value: stats.totalContributionsYear || stats.commitCount90Days, label: "Year Contributions" },
                  { value: stats.commitCount90Days,  label: "Commits (90d)" },
                  { value: stats.commitCount30Days,  label: "Commits (30d)" },
                  { value: stats.currentStreak,      label: "Activity Streak" },
                  { value: profile.accountAgeYears,  label: "Account Age (yrs)" },
                ].map((s) => (
                  <div key={s.label} className="stat-card">
                    <span className="stat-value">{s.value}</span>
                    <span className="stat-label">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="two-col" style={{ marginTop: 8 }}>
                <div>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--txt-2)", marginBottom: 14 }}>💻 Languages</h3>
                  <LanguageBar languages={languageDistribution} />
                </div>
                <div>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--txt-2)", marginBottom: 14 }}>👤 Profile Details</h3>
                  {[
                    { label: "Profile README", value: hasProfileReadme ? "✅ Exists" : "❌ Missing" },
                    { label: "Repos with Descriptions", value: `${stats.reposWithDescription}/${stats.ownedRepos}` },
                    { label: "Repos with Topics", value: `${stats.reposWithTopics}/${stats.ownedRepos}` },
                    { label: "Repos with Licenses", value: `${stats.reposWithLicense}/${stats.ownedRepos}` },
                    { label: "Repos with Live Demo", value: `${stats.reposWithHomepage}/${stats.ownedRepos}` },
                    { label: "Hireable Flag", value: profile.isHireable ? "✅ Set" : "Not Set" },
                    { label: "Public Email", value: profile.email ? "✅ Public" : "Not Public" },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--txt-3)" }}>{item.label}</span>
                      <span style={{ fontWeight: 600 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card title="Activity (Last 12 Weeks)" icon="📅">
              <ActivityHeatmap weeklyActivity={stats.weeklyActivity || []} />
            </Card>

            <Card title={`Top Repositories (${topRepos?.length || 0})`} icon="📦">
              <div className="repos-grid">
                {topRepos?.map((repo) => (
                  <div key={repo.name} className="repo-card">
                    <div className="repo-name">
                      <a href={repo.url} target="_blank" rel="noreferrer">{repo.name}</a>
                      {repo.isForked && <span className="repo-fork-badge">Fork</span>}
                    </div>
                    <p className="repo-desc">
                      {repo.description || <em style={{ color: "var(--txt-3)" }}>No description — add one!</em>}
                    </p>
                    {repo.topics?.length > 0 && (
                      <div className="repo-topics">
                        {repo.topics.slice(0, 4).map((t) => (
                          <span key={t} className="repo-topic">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="repo-meta">
                      {repo.language && <span className="repo-meta-item">💻 {repo.language}</span>}
                      <span className="repo-meta-item">⭐ {repo.stars}</span>
                      <span className="repo-meta-item">🍴 {repo.forks}</span>
                      {repo.hasHomepage && <span className="repo-meta-item" style={{ color: "var(--green)" }}>🌐 Live</span>}
                      <span className={`repo-meta-item ${repo.hasReadme ? "readme-good" : "readme-bad"}`}>
                        {repo.hasReadme ? "📖 README" : "❌ No README"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title={`Skill Gap — ${targetRole ? targetRole.charAt(0).toUpperCase() + targetRole.slice(1) : "Developer"} Role`} icon="🎯">
              <SkillsDetector missingSkills={missingSkills || {}} detectedSkills={skillsDetected || []} targetRole={targetRole} />
            </Card>
          </>
        )}

        {/* ── TAB: PORTFOLIO ── */}
        {activeTab === "portfolio" && portfolioData?.accessible && (
          <>
            <Card title="Portfolio Audit" icon="🌐">
              <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap", fontSize: "0.85rem" }}>
                <span>🌐 <a href={portfolioData.url} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>{portfolioData.url}</a></span>
                <span style={{ color: portfolioData.isHttps ? "var(--green)" : "var(--red)" }}>
                  {portfolioData.isHttps ? "🔒 HTTPS" : "⚠️ HTTP Only"}
                </span>
                {portfolioData.responseTimeMs && (
                  <span style={{ color: portfolioData.responseTimeMs < 2000 ? "var(--green)" : "var(--yellow)" }}>
                    ⚡ {portfolioData.responseTimeMs}ms load
                  </span>
                )}
              </div>
              {portfolioData.seo?.title && (
                <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--r-sm)", fontSize: "0.84rem" }}>
                  <span style={{ color: "var(--txt-3)" }}>Page Title: </span>
                  <strong>"{portfolioData.seo.title}"</strong>
                </div>
              )}
              <div className="checklist-grid">
                {Object.entries(portfolioData.checklist || {}).map(([key, item]) => (
                  <div key={key} className={`checklist-item ${item.pass ? "pass" : "fail"}`}>
                    <span className="checklist-icon">{item.pass ? "✅" : "❌"}</span>
                    <div className="checklist-content">
                      <div className="checklist-label">{item.label}</div>
                      {!item.pass && item.hint && <div className="checklist-hint">{item.hint}</div>}
                      <div className="checklist-importance" style={{ color: item.importance === "critical" ? "var(--red)" : item.importance === "high" ? "var(--yellow)" : "var(--txt-4)" }}>
                        {item.importance}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* ── TAB: EXECUTIVE SYNTHESIS ── */}
        {activeTab === "insights" && (
          <>
            {aiFeedback?.overallSummary && (
              <Card title="Executive Candidate Summary" icon="📝">
                <div style={{ fontSize: "0.78rem", color: "var(--txt-3)", marginBottom: 12 }}>
                  ℹ️ Written by Gemini AI based on your rule-based scores — all numeric scores are 100% deterministic calculations.
                </div>
                <div className="ai-summary-box">{aiFeedback.overallSummary}</div>
              </Card>
            )}

            {aiFeedback?.scoreExplanations && (
              <Card title="Why These Scores?" icon="🔍">
                <div className="score-explanations">
                  {Object.entries(aiFeedback.scoreExplanations).map(([key, text]) => (
                    <div key={key} className="score-explanation-card">
                      <div className="score-exp-label">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                      <div className="score-exp-text">{text}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card title="Strengths & Weaknesses" icon="⚖️">
              <div className="strengths-weaknesses">
                <div className="sw-card strengths">
                  <div className="sw-title">💪 Strengths</div>
                  <div className="sw-list">
                    {(aiFeedback?.strengths || []).map((s, i) => (
                      <div key={i} className="sw-item"><div className="sw-dot" /><span>{s}</span></div>
                    ))}
                    {!aiFeedback?.strengths?.length && <div className="sw-item"><div className="sw-dot" /><span>Keep building!</span></div>}
                  </div>
                </div>
                <div className="sw-card weaknesses">
                  <div className="sw-title">⚠️ Weaknesses</div>
                  <div className="sw-list">
                    {(aiFeedback?.weaknesses || []).map((w, i) => (
                      <div key={i} className="sw-item"><div className="sw-dot" /><span>{w}</span></div>
                    ))}
                    {!aiFeedback?.weaknesses?.length && <div className="sw-item"><div className="sw-dot" /><span>Great — very few issues!</span></div>}
                  </div>
                </div>
              </div>
            </Card>

            {improvements?.length > 0 && (
              <Card title={`All Improvements (${improvements.length}) — Sorted by Impact`} icon="🚀">
                <div style={{ marginBottom: 16, fontSize: "0.84rem", color: "var(--txt-2)" }}>
                  Click any card to see WHY it matters and exactly HOW to fix it.
                </div>
                <div className="improvements-list">
                  {improvements.map((item, i) => (
                    <ImprovementCard key={i} item={item} index={i} />
                  ))}
                </div>
              </Card>
            )}

            <Card title="Recruiter Simulation" icon="👁️">
              <RecruiterSimulator aiFeedback={aiFeedback} profile={profile} scores={scores} />
            </Card>
          </>
        )}

        {/* ── TAB: RESUME ── */}
        {activeTab === "resume" && (
          <>
            {!resumeResult ? (
              <Card title="Resume / CV Analysis" icon="📄">
                <div className="resume-upload-section">
                  <div style={{ fontSize: "3rem", marginBottom: 16 }}>📄</div>
                  <h3 style={{ marginBottom: 8 }}>Upload Your Resume</h3>
                  <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
                    Get ATS compatibility score, keyword analysis, and a comparison against your GitHub profile.
                  </p>
                  <label style={{ cursor: "pointer" }}>
                    <input type="file" accept=".pdf" onChange={handleResumeUpload} style={{ display: "none" }} />
                    <span className="btn-primary" style={{ display: "inline-flex", width: "auto", padding: "12px 28px" }}>
                      {resumeUploading ? "⏳ Analyzing…" : "📎 Upload PDF Resume"}
                    </span>
                  </label>
                  {resumeError && <div className="error-banner" style={{ marginTop: 16, maxWidth: 400, margin: "16px auto 0" }}>⚠️ {resumeError}</div>}
                </div>
              </Card>
            ) : (
              <>
                <Card title="ATS Score Analysis" icon="📊">
                  <div className="resume-ats-grid">
                    {[
                      { label: "Overall ATS Score", value: resumeResult.atsScore, color: resumeResult.atsScore >= 70 ? "var(--green)" : resumeResult.atsScore >= 50 ? "var(--yellow)" : "var(--red)" },
                      { label: "Formatting",    value: resumeResult.atsBreakdown?.formatting || 0,    color: "var(--cyan)" },
                      { label: "Keywords",      value: resumeResult.atsBreakdown?.keywords || 0,      color: "var(--cyan)" },
                      { label: "Action Verbs",  value: resumeResult.atsBreakdown?.actionVerbs || 0,   color: "var(--cyan)" },
                      { label: "Impact Metrics",value: resumeResult.atsBreakdown?.impactMetrics || 0, color: "var(--cyan)" },
                    ].map((m) => (
                      <div key={m.label} className="ats-metric-card">
                        <div className="ats-metric-label">{m.label}</div>
                        <div className="ats-metric-bar-bg">
                          <div className="ats-metric-bar-fill" style={{ width: `${m.value}%`, background: m.color }} />
                        </div>
                        <div className="ats-metric-value" style={{ color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    {[
                      { label: "✅ Action Verbs Used", val: resumeResult.hasActionVerbs },
                      { label: "📊 Impact Metrics Present", val: resumeResult.hasMetrics },
                    ].map((item) => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--txt-2)" }}>{item.label}</span>
                        <span style={{ color: item.val ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{item.val ? "Yes" : "No"}</span>
                      </div>
                    ))}
                  </div>

                  {resumeResult.overallVerdict && (
                    <div className="ai-summary-box">{resumeResult.overallVerdict}</div>
                  )}
                </Card>

                {resumeResult.githubConsistency && (
                  <Card title="GitHub ↔ Resume Consistency" icon="🔄">
                    <div className="consistency-grid">
                      <div className="consistency-card consistency-matching">
                        <div className="consistency-title">✅ In Both</div>
                        <div className="skill-tags">
                          {(resumeResult.githubConsistency.matching || []).map((s) => (
                            <span key={s} className="skill-tag skill-have">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div className="consistency-card consistency-resume">
                        <div className="consistency-title">📄 Resume Only</div>
                        <p style={{ fontSize: "0.78rem", color: "var(--txt-3)", marginBottom: 8 }}>In resume but no GitHub evidence</p>
                        <div className="skill-tags">
                          {(resumeResult.githubConsistency.onlyResume || []).map((s) => (
                            <span key={s} className="skill-tag" style={{ background: "rgba(251,191,36,0.1)", color: "var(--yellow)", border: "1px solid rgba(251,191,36,0.2)" }}>{s}</span>
                          ))}
                        </div>
                      </div>
                      <div className="consistency-card consistency-github">
                        <div className="consistency-title">🐙 GitHub Only</div>
                        <p style={{ fontSize: "0.78rem", color: "var(--txt-3)", marginBottom: 8 }}>In GitHub but not on resume</p>
                        <div className="skill-tags">
                          {(resumeResult.githubConsistency.onlyGithub || []).map((s) => (
                            <span key={s} className="skill-tag skill-miss">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* ── TAB: ROADMAP ── */}
        {activeTab === "roadmap" && (
          <Card title="Personalized Career Roadmap" icon="🗺">
            <CareerRoadmap
              improvements={improvements}
              missingSkills={missingSkills}
              targetRole={targetRole}
              scores={scores}
            />
          </Card>
        )}
      </div>

      {/* Gate Auth Modal */}
      {showAuthModal && (
        <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal-card card anim-scale-in" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => setShowAuthModal(false)}>✕</button>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🔒</div>
              <h3 style={{ fontSize: "1.25rem", margin: "0 0 6px" }}>Unlock Full Career Growth Features</h3>
              <p style={{ color: "var(--txt-2)", fontSize: "0.85rem", margin: 0 }}>
                {authModalReason || "Sign in or create a free account to continue."}
              </p>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <button
                className="btn-primary"
                onClick={() => {
                  try {
                    const currentReport = data || JSON.parse(sessionStorage.getItem("portfolioReport") || "null");
                    if (currentReport && currentReport.shareId) {
                      localStorage.setItem("pending_save_report", JSON.stringify(currentReport));
                    }
                  } catch (_) {}
                  navigate("/auth?mode=register");
                }}
              >
                Create Free Account →
              </button>
              <button
                className="btn-secondary"
                style={{ justifyContent: "center" }}
                onClick={() => {
                  try {
                    const currentReport = data || JSON.parse(sessionStorage.getItem("portfolioReport") || "null");
                    if (currentReport && currentReport.shareId) {
                      localStorage.setItem("pending_save_report", JSON.stringify(currentReport));
                    }
                  } catch (_) {}
                  navigate("/auth?mode=login");
                }}
              >
                Sign In to Existing Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
