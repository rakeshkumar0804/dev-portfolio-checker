import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAccount, getRecentReports, deleteReportFromWorkspace, getLocalSavedReports } from "../services/apiService.js";
import { getScoringTier } from "../../services/scoringService.js";

function getCleanDisplayName(user) {
  if (!user) return { firstName: "Developer", fullName: "Developer" };
  let name = (user.name || "").trim();
  if (!name || name.includes("@")) {
    name = (user.email || "").split("@")[0] || "Developer";
  }
  name = name.replace(/\d+/g, "").trim();
  if (!name) name = "Developer";

  const parts = name.split(/[\s._-]+/);
  const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  const fullName = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
  return { firstName, fullName };
}

function formatExactTimestamp(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (diffDays === 0) return `Today • ${timeStr}`;
  if (diffDays === 1) return `Yesterday • ${timeStr}`;
  if (diffDays <= 7) return `${diffDays} days ago • ${timeStr}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} • ${timeStr}`;
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState("");

  // Interactive SaaS Features State (#2, #8)
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [inspectingReport, setInspectingReport] = useState(null);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("saas_token")) {
      navigate("/auth");
      return;
    }
    fetchDashboardData();
  }, [navigate]);

  function fetchDashboardData() {
    setLoading(true);

    Promise.all([getAccount(), getRecentReports()])
      .then(([accountRes, reportsRes]) => {
        setUser(accountRes.user);
        const serverReports = reportsRes.reports || [];

        console.log("🌐 [FRONTEND FETCH DEBUG STEP 5] GET /api/auth/reports returned:", serverReports.length, "reports (ShareIDs:", serverReports.map(r => r.shareId).join(", ") || "none", ")");

        setReports(serverReports);
        setStats(reportsRes.stats || null);

        // Sync local storage to mirror authoritative server state
        try {
          localStorage.setItem("portfolio_saved_reports_global", JSON.stringify(serverReports));
          localStorage.setItem("portfolio_saved_reports_current", JSON.stringify(serverReports));
        } catch (_) {}
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("saas_token");
          localStorage.removeItem("saas_user");
          navigate("/auth");
        } else {
          const fallbackLocal = getLocalSavedReports("current");
          if (fallbackLocal && fallbackLocal.length > 0) {
            setReports(fallbackLocal);
          } else {
            setError("Failed to load workspace data. Please refresh.");
          }
        }
      })
      .finally(() => setLoading(false));
  }

  async function handleDeleteReport(shareId, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this report from your library?")) return;
    setDeletingId(shareId);
    console.log(`🌐 [FRONTEND DELETE DEBUG STEP 1] Sending DELETE /api/auth/report/${shareId} with shareId:`, shareId);
    try {
      const res = await deleteReportFromWorkspace(shareId);
      console.log("📥 [FRONTEND DELETE DEBUG STEP 1b] Server response received:", res);

      setReports((prev) => prev.filter((r) => r.shareId !== shareId));
      setSelectedForCompare((prev) => prev.filter((id) => id !== shareId));
    } catch (err) {
      console.error("❌ [FRONTEND DELETE DEBUG Error]:", err.message);
      alert("Could not delete report. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleShareReport(shareId, e) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/results/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleCompareSelection(shareId, e) {
    e.stopPropagation();
    if (selectedForCompare.includes(shareId)) {
      setSelectedForCompare((prev) => prev.filter((id) => id !== shareId));
    } else {
      if (selectedForCompare.length >= 2) {
        alert("You can compare up to 2 reports side-by-side. Unselect one first.");
        return;
      }
      setSelectedForCompare((prev) => [...prev, shareId]);
    }
  }

  if (loading) {
    return (
      <main className="dashboard-page" style={{ minHeight: "80vh", padding: "110px 20px 60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }} className="anim-fade-in">⚡</div>
          <p style={{ color: "var(--txt-2)" }}>Loading your career workspace…</p>
        </div>
      </main>
    );
  }

  const { firstName } = getCleanDisplayName(user);
  const userInitial = firstName.charAt(0).toUpperCase();

  const totalReports = reports.length;
  const latestReport = reports[0] || null;
  const latestScore = stats?.latestScore || (latestReport?.scores?.overall) || null;
  const bestScore = stats?.bestScore || (reports.length ? Math.max(...reports.map((r) => r.scores?.overall || 0)) : null);
  const scoreDiff = stats?.scoreDiff || null;
  const latestTier = latestScore ? getScoringTier(latestScore) : null;
  const bestTier = bestScore ? getScoringTier(bestScore) : null;
  const targetScoreGoal = 85;

  // Filter & Sort Logic (#8)
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      (r.githubUsername || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.targetRole || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || (r.targetRole || "").toLowerCase() === roleFilter;
    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    if (sortBy === "highest") return (b.scores?.overall || 0) - (a.scores?.overall || 0);
    if (sortBy === "improvement") return (b.deltas?.overallDiff || 0) - (a.deltas?.overallDiff || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Actionable Gap Computations (#7)
  const topActionableGaps = [
    { title: "Add descriptions to unlabelled repositories", impact: "+5 pts", category: "Documentation" },
    { title: "Align resume skills with target role keywords", impact: "+4 pts", category: "ATS Alignment" },
    { title: "Add topic tags & live deployment URLs to top repos", impact: "+3 pts", category: "Project Engineering" },
  ];

  // Contextual Score Reason (#1 & #6)
  let scoreExplanation = "";
  if (latestScore >= 85) {
    const ghText = latestReport?.scores?.github ? `${latestReport.scores.github}/100` : "high cadence";
    const portText = latestReport?.scores?.portfolio ? `${latestReport.scores.portfolio}/100` : "verified portfolio";
    scoreExplanation = `Driven by strong GitHub commit cadence (${ghText}) and verified SSL/responsive portfolio (${portText}). You meet recruiter benchmarks for Interview Ready status.`;
  } else if (latestScore >= 75) {
    const ghText = latestReport?.scores?.github ? `${latestReport.scores.github}/100` : "solid foundation";
    scoreExplanation = `Solid codebase foundation (${ghText}) and project engineering. Missing repository descriptions and ATS keyword alignment hold back your score from Interview Ready (85+).`;
  } else if (latestScore) {
    scoreExplanation = `Baseline profile established. Score is limited by missing README documentation and unverified live demo deployments.`;
  } else {
    scoreExplanation = `No scans run yet. Run your first analysis to set your baseline hireability score.`;
  }

  // Compare Reports Pair
  const compareReportsList = reports.filter((r) => selectedForCompare.includes(r.shareId));

  return (
    <main
      className="dashboard-page anim-fade-up"
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "110px 20px 48px",
      }}
    >
      {/* 1. Header */}
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "1 1 auto", minWidth: 0 }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--cyan), #6366f1)",
              color: "#fff", fontWeight: 800, fontSize: "1.35rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(14, 165, 233, 0.35)",
              flexShrink: 0,
            }}
          >
            {userInitial}
          </div>
          <div style={{ minWidth: 0 }}>
            <span className="signal-eyebrow" style={{ margin: "0 0 2px", display: "block" }}>
              Career Intelligence Workspace
            </span>
            <h1
              style={{
                fontSize: "clamp(1.5rem, 3.5vw, 1.85rem)",
                fontWeight: 700, margin: "0 0 2px",
                color: "var(--txt-1)", letterSpacing: "-0.02em",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              Welcome back, {firstName} 👋
            </h1>
            <p style={{ color: "var(--txt-2)", margin: 0, fontSize: "0.85rem" }}>
              Continuous evidence-based evaluation & recruiter readiness tracking.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {selectedForCompare.length === 2 && (
            <button
              className="btn-secondary"
              onClick={() => setShowCompareModal(true)}
              style={{ background: "rgba(99, 102, 241, 0.2)", color: "#818cf8", border: "1px solid rgba(99, 102, 241, 0.4)" }}
            >
              ⚖️ Compare 2 Selected Reports
            </button>
          )}
          <Link
            className="btn-primary"
            to="/"
            style={{ textDecoration: "none", width: "auto", padding: "10px 20px", fontSize: "0.88rem", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            + Run New Analysis →
          </Link>
        </div>
      </header>

      {/* 2. Core Objective & Score Context Banner (#1 Hero Summary Tightened) */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          padding: "16px 20px", // Reduced padding by 12% for tighter, cleaner height
          background: "linear-gradient(135deg, rgba(11, 23, 41, 0.9), rgba(15, 23, 42, 0.95))",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div>
            <span className="signal-eyebrow" style={{ color: "var(--cyan)", fontSize: "0.72rem", letterSpacing: "0.05em" }}>
              🎯 CORE OBJECTIVE: AM I BECOMING MORE HIREABLE?
            </span>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "2px 0 0", color: "#ffffff" }}>
              {latestScore ? `Score ${latestScore} / 100 — ${latestTier?.label}` : "Set Your Baseline Hireability Score"}
            </h2>
          </div>
          {scoreDiff !== null && (
            <span
              style={{
                padding: "4px 10px", borderRadius: 16, fontSize: "0.78rem", fontWeight: 700,
                background: scoreDiff >= 0 ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: scoreDiff >= 0 ? "#4ade80" : "#f87171",
                border: scoreDiff >= 0 ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              {scoreDiff >= 0 ? `📈 +${scoreDiff} pts since last scan` : `⚠️ ${scoreDiff} pts since last scan`}
            </span>
          )}
        </div>

        <p style={{ color: "#cbd5e1", fontSize: "0.88rem", lineHeight: 1.5, margin: "0 0 14px" }}>
          {scoreExplanation}
        </p>

        {/* Actionable Gap Explanations (#7) */}
        {latestScore < targetScoreGoal && (
          <div
            style={{
              padding: "10px 14px", borderRadius: 8,
              background: "rgba(56, 189, 248, 0.04)",
              border: "1px solid rgba(56, 189, 248, 0.15)",
            }}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.04em" }}>
              ⚡ Top 3 Actions to Earn {targetScoreGoal - latestScore} Missing Points to Reach Interview Ready (85+)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
              {topActionableGaps.map((item, idx) => (
                <div key={idx} style={{ fontSize: "0.8rem", color: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(15, 23, 42, 0.6)", padding: "6px 10px", borderRadius: 6 }}>
                  <span>{item.title}</span>
                  <span style={{ fontWeight: 700, color: "#4ade80", flexShrink: 0, marginLeft: 8 }}>{item.impact}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. 4 Key Metrics Cards (#2 Identical Heights & Alignment) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 110 }}>
          <div>
            <span className="signal-eyebrow" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>LATEST HIRING SCORE</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0 2px" }}>
              <span style={{ fontSize: "2rem", fontWeight: 800, color: latestScore ? "var(--cyan)" : "#64748b", lineHeight: 1.1 }}>
                {latestScore ?? "—"}
              </span>
              {latestTier && (
                <span style={{ fontSize: "0.78rem", color: latestTier.color, fontWeight: 700 }}>
                  {latestTier.label}
                </span>
              )}
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>
            {scoreDiff !== null ? `${scoreDiff >= 0 ? "+" : ""}${scoreDiff} pts vs previous scan` : "Current evaluation baseline"}
          </span>
        </div>

        <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 110 }}>
          <div>
            <span className="signal-eyebrow" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>PEAK BEST SCORE</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0 2px" }}>
              <span style={{ fontSize: "2rem", fontWeight: 800, color: bestScore ? "#818cf8" : "#64748b", lineHeight: 1.1 }}>
                {bestScore ?? "—"}
              </span>
              {bestTier && (
                <span style={{ fontSize: "0.78rem", color: bestTier.color, fontWeight: 700 }}>
                  {bestTier.label}
                </span>
              )}
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>
            Highest score milestone recorded
          </span>
        </div>

        <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 110 }}>
          <div>
            <span className="signal-eyebrow" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>GOAL DISTANCE</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0 2px" }}>
              <span style={{ fontSize: "2rem", fontWeight: 800, color: "#f59e0b", lineHeight: 1.1 }}>
                {latestScore !== null ? (latestScore >= 85 ? "0" : `${85 - latestScore} pts`) : "—"}
              </span>
              <span style={{ fontSize: "0.78rem", color: "#f59e0b", fontWeight: 700 }}>
                {latestScore >= 85 ? "Interview Ready" : "Target: 85+"}
              </span>
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>
            {latestScore >= 85 ? "All recruiter threshold benchmarks met" : "Points needed to hit recruiter interview tier"}
          </span>
        </div>

        <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 110 }}>
          <div>
            <span className="signal-eyebrow" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>SAVED REPORTS</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0 2px" }}>
              <span style={{ fontSize: "2rem", fontWeight: 800, color: "#38bdf8", lineHeight: 1.1 }}>
                {totalReports}
              </span>
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>
            {totalReports === 1 ? "1 saved evaluation snapshot" : `${totalReports} historical evaluation snapshots`}
          </span>
        </div>
      </div>

      {/* 4. Report Library Section with Search, Filter & Sort Toolbar (#2 Breathing Room) */}
      <section className="reports-panel" style={{ marginBottom: 36, width: "100%" }}>
        <div style={{ marginBottom: 16 }}>
          <span className="signal-eyebrow" style={{ fontSize: "0.72rem", letterSpacing: "0.05em" }}>Saved Private Analyses</span>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "2px 0 0", color: "#ffffff" }}>
            Report Library ({filteredReports.length})
          </h2>
        </div>

        {/* Search, Filter, & Sort Full-Width Toolbar (#4 Perfect Flush Alignment) */}
        {totalReports > 0 && (
          <div
            style={{
              display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10,
              background: "rgba(15, 23, 42, 0.4)", border: "1px solid var(--border)",
              padding: "8px 12px", borderRadius: 10, marginBottom: 20, width: "100%", boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 220px" }}>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>🔍</span>
              <input
                type="text"
                placeholder="Search username or role…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  height: 34, padding: "0 12px", borderRadius: 6, fontSize: "0.82rem",
                  background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border)",
                  color: "var(--txt-1)", outline: "none", flex: 1, minWidth: 160, boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  height: 34, padding: "0 10px", borderRadius: 6, fontSize: "0.82rem",
                  background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border)",
                  color: "var(--txt-1)", outline: "none", boxSizing: "border-box", cursor: "pointer",
                }}
              >
                <option value="all">All Roles</option>
                <option value="fullstack">Fullstack</option>
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
                <option value="mobile">Mobile</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  height: 34, padding: "0 10px", borderRadius: 6, fontSize: "0.82rem",
                  background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border)",
                  color: "var(--txt-1)", outline: "none", boxSizing: "border-box", cursor: "pointer",
                }}
              >
                <option value="latest">Latest First</option>
                <option value="highest">Highest Score</option>
                <option value="improvement">Biggest Improvement</option>
              </select>
            </div>
          </div>
        )}

        {totalReports === 0 ? (
          <div
            className="card"
            style={{
              textAlign: "center", padding: "48px 24px",
              background: "rgba(15, 23, 42, 0.4)", border: "1px solid var(--border)", borderRadius: 12,
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🚀</div>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 6 }}>Your Private Career Growth Library is Ready</h3>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", maxWidth: 440, margin: "0 auto 20px" }}>
              Run your first profile analysis to benchmark your GitHub activity, code quality, portfolio SEO, and ATS resume alignment.
            </p>
            <Link className="btn-primary" to="/" style={{ textDecoration: "none", display: "inline-flex" }}>
              Run My First Analysis →
            </Link>
          </div>
        ) : (
          /* Intelligent Adaptive Responsive Grid (100% Fluid - Never Clips on DevTools or Mobile) */
          <div
            style={{
              display: "grid",
              gap: 16,
              justifyContent: filteredReports.length === 1 ? "center" : "stretch",
              gridTemplateColumns:
                filteredReports.length === 1
                  ? "min(100%, 560px)"
                  : "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
            }}
          >
            {filteredReports.map((report, idx) => {
              const tier = getScoringTier(report.scores?.overall);
              const isSelectedCompare = selectedForCompare.includes(report.shareId);
              const isLatest = idx === 0 && sortBy === "latest";

              return (
                <div
                  key={report.shareId}
                  className="card saas-report-card"
                  style={{
                    background: "var(--bg-card)",
                    border: isSelectedCompare
                      ? "1px solid var(--cyan)"
                      : isLatest
                      ? "1px solid rgba(56, 189, 248, 0.4)"
                      : "1px solid var(--border)",
                    boxShadow: isLatest ? "0 4px 20px rgba(14, 165, 233, 0.12)" : "none",
                    borderRadius: 12,
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                    padding: 20, minHeight: 220, position: "relative",
                  }}
                >
                  <div>
                    {/* Header Row with Compare Checkbox, Latest Badge & Date (#1 & #3) */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "#94a3b8", cursor: "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          checked={isSelectedCompare}
                          onChange={(e) => toggleCompareSelection(report.shareId, e)}
                          style={{ cursor: "pointer", accentColor: "var(--cyan)" }}
                        />
                        Compare
                      </label>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isLatest && (
                          <span
                            style={{
                              fontSize: "0.7rem", fontWeight: 700, padding: "2px 7px", borderRadius: 12,
                              background: "rgba(56, 189, 248, 0.15)", color: "var(--cyan)",
                              border: "1px solid rgba(56, 189, 248, 0.3)", letterSpacing: "0.02em",
                            }}
                          >
                            Latest
                          </span>
                        )}
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
                          {formatExactTimestamp(report.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Profile Title (@username primary focus) */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#ffffff", letterSpacing: "-0.01em" }}>
                        @{report.githubUsername || "developer"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", textTransform: "capitalize", marginTop: 2 }}>
                        Target: {report.targetRole || "Fullstack Developer"}
                      </div>
                    </div>

                    {/* Score & Status Badge Container */}
                    <div
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 12, marginBottom: 12, padding: "10px 14px", borderRadius: 8,
                        background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                        <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--cyan)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                          {report.scores?.overall || "—"}
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700 }}>/100</span>
                      </div>
                      {tier && (
                        <span
                          style={{
                            fontSize: "0.72rem", padding: "3px 10px", borderRadius: 12, fontWeight: 700,
                            background: `${tier.color}15`, color: tier.color,
                            border: `1px solid ${tier.color}35`, letterSpacing: "0.01em",
                            display: "inline-flex", alignItems: "center", lineHeight: 1.2,
                          }}
                        >
                          {tier.label}
                        </span>
                      )}
                    </div>

                    {/* Unique Diff Badges */}
                    {report.deltas?.highlights && report.deltas.highlights.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                        {report.deltas.highlights.map((h, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: "0.7rem", padding: "2px 7px", borderRadius: 6, fontWeight: 600,
                              background: h.includes("+") ? "rgba(34, 197, 94, 0.12)" : "rgba(255, 255, 255, 0.05)",
                              color: h.includes("+") ? "#4ade80" : "#94a3b8",
                              border: h.includes("+") ? "1px solid rgba(34, 197, 94, 0.25)" : "1px solid var(--border)",
                            }}
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar (#4 Enhanced Hover Feedback) */}
                  <div
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      paddingTop: 12, borderTop: "1px solid var(--border)", marginTop: "auto", gap: 8,
                    }}
                  >
                    <button
                      onClick={() => setInspectingReport(report)}
                      style={{
                        height: 32, padding: "0 12px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600,
                        background: "rgba(56, 189, 248, 0.12)", color: "var(--cyan)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        cursor: "pointer", transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
                        display: "inline-flex", alignItems: "center",
                      }}
                    >
                      🔍 Inspect
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button
                        onClick={(e) => handleShareReport(report.shareId, e)}
                        aria-label="Copy share link for this report"
                        className="btn-secondary"
                        style={{
                          height: 32, background: "rgba(255,255,255,0.03)", border: "1px solid transparent",
                          borderRadius: 6, color: copiedId === report.shareId ? "#4ade80" : "#94a3b8",
                          fontSize: "0.78rem", fontWeight: 500, cursor: "pointer", padding: "0 8px",
                          display: "inline-flex", alignItems: "center", transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      >
                        {copiedId === report.shareId ? "Copied!" : "🔗 Share"}
                      </button>
                      <button
                        onClick={(e) => handleDeleteReport(report.shareId, e)}
                        disabled={deletingId === report.shareId}
                        aria-label="Delete this saved report"
                        className="btn-secondary"
                        style={{
                          height: 32, background: "rgba(255,255,255,0.03)", border: "1px solid transparent",
                          borderRadius: 6, color: "#f87171",
                          fontSize: "0.78rem", cursor: "pointer", padding: "0 8px",
                          opacity: deletingId === report.shareId ? 0.5 : 0.85,
                          display: "inline-flex", alignItems: "center", transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Detailed Inspect Report Modal (#2) */}
      {inspectingReport && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(2, 8, 16, 0.85)", backdropFilter: "blur(6px)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={() => setInspectingReport(null)}
        >
          <div
            className="card anim-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto",
              background: "#0b1729", border: "1px solid rgba(56, 189, 248, 0.3)",
              padding: 24, borderRadius: 12, boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <span className="signal-eyebrow" style={{ color: "var(--cyan)" }}>
                  Deep-Dive Evaluation Inspect
                </span>
                <h3 style={{ fontSize: "1.3rem", margin: "2px 0 0", color: "#fff" }}>
                  @{inspectingReport.githubUsername || "developer"}
                </h3>
                <span style={{ fontSize: "0.78rem", color: "var(--txt-2)" }}>
                  Evaluated {formatExactTimestamp(inspectingReport.createdAt)}
                </span>
              </div>
              <button
                onClick={() => setInspectingReport(null)}
                style={{ background: "transparent", border: "none", color: "var(--txt-2)", fontSize: "1.4rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Score & Recruiter Readiness Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 14, borderRadius: 8, background: "rgba(15, 23, 42, 0.6)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--txt-2)" }}>HIRING SCORE</span>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--cyan)" }}>
                  {inspectingReport.scores?.overall || "—"} / 100
                </div>
                <span style={{ fontSize: "0.78rem", color: getScoringTier(inspectingReport.scores?.overall)?.color, fontWeight: 700 }}>
                  {getScoringTier(inspectingReport.scores?.overall)?.label}
                </span>
              </div>
              <div style={{ padding: 14, borderRadius: 8, background: "rgba(15, 23, 42, 0.6)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--txt-2)" }}>PROGRESS DELTA</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#4ade80", margin: "6px 0 2px" }}>
                  {inspectingReport.deltas?.highlights?.join(" • ") || "Baseline Assessment"}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--txt-3)" }}>Scanned against profile history</span>
              </div>
            </div>

            {/* 4 Pillar Scores Breakdown */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: "0.95rem", color: "var(--txt-1)", marginBottom: 12 }}>Readiness Pillar Scores</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "GitHub Code Signal", score: inspectingReport.scores?.github ?? 0 },
                  { label: "Project Engineering", score: inspectingReport.scores?.projectQuality ?? 0 },
                  { label: "Portfolio SEO & Tech", score: inspectingReport.scores?.portfolio ?? 0 },
                  { label: "Resume ATS Alignment", score: inspectingReport.scores?.hiringReadiness ?? 0 },
                ].map((p, i) => (
                  <div key={i} style={{ padding: 10, borderRadius: 6, background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 4 }}>
                      <span style={{ color: "var(--txt-2)" }}>{p.label}</span>
                      <span style={{ fontWeight: 700, color: "var(--cyan)" }}>{p.score} / 100</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                      <div style={{ width: `${p.score}%`, height: "100%", background: "var(--cyan)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Explainable Evidence Breakdown List */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: "0.95rem", color: "var(--txt-1)", marginBottom: 10 }}>Explainable Evidence Breakdown</h4>
              <div style={{ display: "grid", gap: 8, maxHeight: 200, overflowY: "auto", paddingRight: 4 }}>
                {Object.entries(inspectingReport.scoreBreakdowns || {}).flatMap(([cat, items]) => items || []).map((item, idx) => {
                  const pts = item.score || 0;
                  const isPositive = pts > 0;
                  return (
                    <div key={idx} style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#ffffff" }}>{item.label}</div>
                        <div style={{ fontSize: "0.76rem", color: "var(--txt-2)", marginTop: 2 }}>{item.evidence}</div>
                      </div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: isPositive ? "#4ade80" : "#f87171", flexShrink: 0 }}>
                        {isPositive ? `+${pts}` : `${pts}`} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action CTA */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn-secondary" onClick={() => setInspectingReport(null)}>
                Close
              </button>
              <Link
                className="btn-primary"
                to={`/results/${inspectingReport.shareId}`}
                style={{ textDecoration: "none", fontSize: "0.85rem" }}
              >
                View Full Detailed Report →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 6. Compare Reports Modal (#8) */}
      {showCompareModal && compareReportsList.length === 2 && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(2, 8, 16, 0.85)", backdropFilter: "blur(6px)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={() => setShowCompareModal(false)}
        >
          <div
            className="card anim-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 760, width: "100%", maxHeight: "90vh", overflowY: "auto",
              background: "#0b1729", border: "1px solid rgba(99, 102, 241, 0.4)",
              padding: 24, borderRadius: 12, boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span className="signal-eyebrow" style={{ color: "#818cf8" }}>Side-by-Side Comparison</span>
                <h3 style={{ fontSize: "1.25rem", margin: "2px 0 0", color: "#fff" }}>Report Snapshot Delta</h3>
              </div>
              <button onClick={() => setShowCompareModal(false)} style={{ background: "transparent", border: "none", color: "var(--txt-2)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {[compareReportsList[1], compareReportsList[0]].map((rep, idx) => (
                <div key={idx} style={{ padding: 16, borderRadius: 8, background: "rgba(15, 23, 42, 0.7)", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--txt-3)" }}>{idx === 0 ? "Baseline Snapshot" : "Latest Snapshot"}</span>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--cyan)", margin: "4px 0 2px" }}>
                    {rep?.scores?.overall || "—"} / 100
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--txt-2)", marginBottom: 12 }}>
                    {formatExactTimestamp(rep?.createdAt)}
                  </div>
                  <div style={{ fontSize: "0.78rem", display: "grid", gap: 6 }}>
                    <div>GitHub Signal: <strong>{rep?.scores?.github || 0}</strong></div>
                    <div>Projects Code: <strong>{rep?.scores?.projectQuality || 0}</strong></div>
                    <div>Portfolio SEO: <strong>{rep?.scores?.portfolio || 0}</strong></div>
                    <div>Resume ATS: <strong>{rep?.scores?.hiringReadiness || 0}</strong></div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "right" }}>
              <button className="btn-secondary" onClick={() => setShowCompareModal(false)}>
                Done Comparing
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
