import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeFullProfile, uploadResume } from "../services/apiService.js";
import LoadingScreen from "../components/LoadingScreen.jsx";

const ROLES = [
  { id: "fullstack",    label: "Full Stack",   icon: "🔄" },
  { id: "frontend",     label: "Frontend",     icon: "🎨" },
  { id: "backend",      label: "Backend",      icon: "⚙️" },
  { id: "react",        label: "React Dev",    icon: "⚛️" },
  { id: "node",         label: "Node.js",      icon: "🟢" },
  { id: "python_dev",   label: "Python",       icon: "🐍" },
  { id: "java_dev",     label: "Java",         icon: "☕" },
  { id: "ai_ml",        label: "AI / ML",      icon: "🧠" },
  { id: "data_science", label: "Data Science", icon: "📊" },
  { id: "devops",       label: "DevOps",       icon: "🚀" },
  { id: "mobile",       label: "Mobile",       icon: "📱" },
];

const MODES = [
  { id: "full_360",   label: "Full 360° Audit", icon: "💎", desc: "GitHub + Portfolio + Resume" },
  { id: "github_only", label: "GitHub Only",     icon: "🐙", desc: "Repos & Code Quality" },
  { id: "portfolio_only", label: "Portfolio Only", icon: "🌐", desc: "SEO, Vitals & UI Audit" },
  { id: "resume_only", label: "Resume Only",    icon: "📄", desc: "ATS & Keywords Score" },
  { id: "custom",     label: "Custom Combo",   icon: "⚡", desc: "Choose any inputs" },
];

const TRUST_SIGNALS = [
  { icon: "🔒", label: "Read-Only GitHub API (No Credentials Required)" },
  { icon: "📄", label: "ATS Resume Compatibility Audit" },
  { icon: "🌐", label: "Portfolio SEO & Web Vitals Audit" },
  { icon: "📊", label: "100% Deterministic Evidence Scores" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [activeMode, setActiveMode] = useState("full_360");
  const [githubUsername, setGithubUsername] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [targetRole, setTargetRole] = useState("fullstack");
  const [resumeFile, setResumeFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleResumeDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") setResumeFile(file);
    else setError("Only PDF files are accepted for resume upload.");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const hasGithub = !!githubUsername.trim();
    const hasPortfolio = !!portfolioUrl.trim();
    const hasResume = !!resumeFile;

    if (!hasGithub && !hasPortfolio && !hasResume) {
      setError("Please provide at least one input source (GitHub username, Portfolio URL, or Resume PDF).");
      return;
    }

    setLoading(true);

    try {
      let initialResumeResult = null;

      if (resumeFile) {
        try {
          const formData = new FormData();
          formData.append("resume", resumeFile);
          formData.append("targetRole", targetRole);
          const resResult = await uploadResume(formData);
          initialResumeResult = resResult.resumeAnalysis;
        } catch (_) {
          console.warn("Resume parsing skipped or non-critical error");
        }
      }

      const result = await analyzeFullProfile({
        githubUsername: githubUsername.trim() || null,
        portfolioUrl: portfolioUrl.trim() || null,
        targetRole,
        resumeAnalysis: initialResumeResult,
      });

      sessionStorage.setItem("portfolioReport", JSON.stringify(result));
      navigate(`/results/${result.shareId}`);
    } catch (err) {
      console.error("HomePage submit error:", err);
      // Friendly, non-technical error handling as requested
      setError("Analysis couldn't be completed right now. Our service might be temporarily busy. Please try again.");
      setLoading(false);
    }
  }

  if (loading) return <LoadingScreen githubUsername={githubUsername} portfolioUrl={portfolioUrl} resumeFile={resumeFile} />;

  return (
    <div className="page-wrap">
      {/* Hero */}
      <div className="hero">
        <div className="hero-grid">
          {/* Left Hero Header */}
          <div className="anim-fade-up">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              PortfolioPulse · AI Career Intelligence Workspace
            </div>

            <h1 className="hero-title">
              Know What Technical Recruiters{" "}
              <span className="hero-title-grad">Actually See in 10 Seconds</span>
            </h1>

            <p className="hero-subtitle">
              Connect your GitHub, Portfolio, or Resume — get a deterministic, evidence-based profile audit with AI executive summaries and high-impact score fixes.
            </p>

            {/* Product Value Metrics */}
            <div className="hero-stats">
              <div className="hero-stat-item">
                <span className="hero-stat-value">20+</span>
                <span className="hero-stat-label">Hiring Signals</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-value">3</span>
                <span className="hero-stat-label">Analysis Sources</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-value">90s</span>
                <span className="hero-stat-label">Automated Report</span>
              </div>
            </div>

            {/* Trust Signals */}
            <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
              {TRUST_SIGNALS.map((ts, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.82rem", color: "var(--txt-2)" }}>
                  <span style={{ fontSize: "1rem" }}>{ts.icon}</span>
                  <span>{ts.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Input Card */}
          <div className="anim-fade-up anim-delay-1">
            <div className="card hero-form-card">
              <h2 className="form-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Analyze Your Profile</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--cyan)", background: "rgba(56, 189, 248, 0.1)", padding: "4px 10px", borderRadius: 12 }}>
                  Read-Only Security
                </span>
              </h2>
              <p className="form-sub">Select an audit mode and input your profile details below.</p>

              {/* Mode Selectors */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: 20 }}>
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveMode(m.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: `1px solid ${activeMode === m.id ? "rgba(56, 189, 248, 0.5)" : "var(--border)"}`,
                      background: activeMode === m.id ? "rgba(56, 189, 248, 0.12)" : "rgba(255,255,255,0.02)",
                      color: activeMode === m.id ? "var(--cyan)" : "var(--txt-2)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div>{m.icon} {m.label}</div>
                  </button>
                ))}
              </div>

              {/* Form inputs */}
              <form onSubmit={handleSubmit}>
                {/* Target Role Dropdown */}
                <div className="form-group">
                  <label className="form-label">Target Role Specialty</label>
                  <select
                    className="input-select"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.icon} {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* GitHub Input */}
                {(activeMode === "full_360" || activeMode === "github_only" || activeMode === "custom") && (
                  <div className="form-group">
                    <label className="form-label">GitHub Username</label>
                    <div className="input-prefix-wrap">
                      <span className="input-prefix">github.com/</span>
                      <input
                        type="text"
                        className="input-field prefixed"
                        placeholder="username"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Portfolio Input */}
                {(activeMode === "full_360" || activeMode === "portfolio_only" || activeMode === "custom") && (
                  <div className="form-group">
                    <label className="form-label">Portfolio Website URL</label>
                    <input
                      type="url"
                      className="input-field"
                      placeholder="https://yourportfolio.dev"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                    />
                  </div>
                )}

                {/* Resume Upload Input */}
                {(activeMode === "full_360" || activeMode === "resume_only" || activeMode === "custom") && (
                  <div className="form-group">
                    <label className="form-label">Resume PDF (ATS Keyword Match)</label>
                    <div
                      className={`dropzone ${dragOver ? "dragover" : ""} ${resumeFile ? "has-file" : ""}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleResumeDrop}
                      onClick={() => fileRef.current?.click()}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept="application/pdf"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file && file.type === "application/pdf") setResumeFile(file);
                        }}
                      />
                      {resumeFile ? (
                        <div className="dropzone-file">
                          <span style={{ fontSize: 24 }}>📄</span>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--txt-1)", fontSize: "0.85rem" }}>{resumeFile.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--green)" }}>Ready for ATS keyword extraction</div>
                          </div>
                        </div>
                      ) : (
                        <div className="dropzone-prompt">
                          <span style={{ fontSize: 22, marginBottom: 4 }}>📄</span>
                          <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "var(--txt-1)" }}>
                            Drop your Resume PDF here or click to browse
                          </div>
                          <div style={{ fontSize: "0.73rem", color: "var(--txt-3)" }}>Maximum 5MB PDF</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Friendly Error Box */}
                {error && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: 12,
                      padding: "12px 16px",
                      marginBottom: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ color: "#f87171", fontSize: "0.83rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>⚠️</span> {error}
                    </div>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      style={{
                        alignSelf: "flex-start",
                        padding: "4px 12px",
                        background: "rgba(239, 68, 68, 0.2)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#f87171",
                        borderRadius: 6,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🔄 Retry Analysis
                    </button>
                  </div>
                )}

                {/* Primary CTA */}
                <button type="submit" className="btn-primary form-submit-btn" style={{ width: "100%", padding: "14px", fontSize: "1rem", fontWeight: 700 }}>
                  Get My Hiring Score →
                </button>

                {/* 1-Click Sample Demo Report Button */}
                <div style={{ marginTop: 12, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setGithubUsername("rakeshkumar0804");
                      setPortfolioUrl("https://developer-portfolio-nu-rouge.vercel.app/");
                      setLoading(true);
                      analyzeFullProfile({
                        githubUsername: "rakeshkumar0804",
                        portfolioUrl: "https://developer-portfolio-nu-rouge.vercel.app/",
                        targetRole: "fullstack",
                        resumeAnalysis: {
                          atsScore: 78,
                          skillsExtracted: ["React", "Node.js", "Express", "MongoDB", "JavaScript", "TypeScript", "HTML", "CSS"],
                          hasMetrics: true,
                        },
                      }).then((result) => {
                        sessionStorage.setItem("portfolioReport", JSON.stringify(result));
                        navigate(`/results/${result.shareId}`);
                      }).catch((err) => {
                        setError("Sample report load couldn't be completed. Please try again.");
                        setLoading(false);
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      color: "var(--cyan)",
                      fontWeight: 600,
                      fontSize: "0.83rem",
                      cursor: "pointer",
                    }}
                  >
                    ⚡ Try Live Sample Demo Report (1-Click)
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
