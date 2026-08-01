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

const FEATURES = [
  "GitHub profile, repos & activity analysis",
  "Portfolio SEO, accessibility & performance audit",
  "AI-powered feedback with improvement estimates",
  "10-Second recruiter scan simulation",
  "Skill gap detection by target role",
  "Resume ATS compatibility checker",
  "Career roadmap with weekly milestones",
  "Shareable public report link",
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

      // Handle resume upload first if provided
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
      const msg = err.response?.data?.message || err.message || "Analysis failed. Please try again.";
      setError(msg);
      setLoading(false);
    }
  }

  if (loading) return <LoadingScreen githubUsername={githubUsername} portfolioUrl={portfolioUrl} resumeFile={resumeFile} />;

  return (
    <div className="page-wrap">
      {/* Hero */}
      <div className="hero">
        <div className="hero-grid">
          {/* Left */}
          <div className="anim-fade-up">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Evidence-Based Developer Audit · Gemini AI Summary
            </div>

            <h1 className="hero-title">
              Know What Recruiters{" "}
              <span className="hero-title-grad">Actually See in 10 Seconds</span>
            </h1>

            <p className="hero-subtitle">
              Enter your GitHub, Portfolio, or Resume — get a deterministic, evidence-based profile audit with Gemini AI executive summaries and actionable fixes.
            </p>

            <div className="hero-stats">
              <div className="hero-stat-item">
                <span className="hero-stat-value">100%</span>
                <span className="hero-stat-label">Deterministic Scores</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-value">Gemini</span>
                <span className="hero-stat-label">AI Summary Text</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-value">Free</span>
                <span className="hero-stat-label">No Signup Needed</span>
              </div>
            </div>

            <div className="features-list">
              {FEATURES.map((f, i) => (
                <div key={i} className="feature-item anim-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="feature-item-dot" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div className="anim-fade-up anim-delay-2">
            <div className="analysis-card">
              <h2 className="analysis-card-title">Analyze Profile</h2>
              <p className="analysis-card-sub">
                Select your audit mode & target role below
              </p>

              {/* Mode Selector Tabs */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`role-btn ${activeMode === m.id ? "active" : ""}`}
                    style={{ fontSize: "0.76rem", padding: "6px 12px" }}
                    onClick={() => {
                      setActiveMode(m.id);
                      if (m.id === "github_only") { setPortfolioUrl(""); }
                      else if (m.id === "portfolio_only") { setGithubUsername(""); }
                      else if (m.id === "resume_only") { setGithubUsername(""); setPortfolioUrl(""); }
                    }}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                {/* Target Role Selector */}
                <div className="form-group">
                  <label className="form-label">
                    <span className="form-label-icon">🎯</span>
                    Target Role
                  </label>
                  <div className="role-selector" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ROLES.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        className={`role-btn ${targetRole === role.id ? "active" : ""}`}
                        onClick={() => setTargetRole(role.id)}
                      >
                        {role.icon} {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* GitHub Username */}
                {(activeMode !== "portfolio_only" && activeMode !== "resume_only") && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="github-username">
                      <span className="form-label-icon">🐙</span>
                      GitHub Username
                      {activeMode === "github_only" ? (
                        <span style={{ color: "var(--red)" }}> *</span>
                      ) : (
                        <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.78rem" }}> (optional)</span>
                      )}
                    </label>
                    <input
                      id="github-username"
                      type="text"
                      className="form-input"
                      placeholder="e.g. torvalds"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      autoComplete="off"
                      spellCheck="false"
                    />
                    <p className="form-hint">💡 Just the username, e.g. "rakeshkumar0804"</p>
                  </div>
                )}

                {/* Portfolio */}
                {(activeMode !== "github_only" && activeMode !== "resume_only") && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="portfolio-url">
                      <span className="form-label-icon">🌐</span>
                      Portfolio URL
                      {activeMode === "portfolio_only" ? (
                        <span style={{ color: "var(--red)" }}> *</span>
                      ) : (
                        <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.78rem" }}> (optional)</span>
                      )}
                    </label>
                    <input
                      id="portfolio-url"
                      type="url"
                      className="form-input"
                      placeholder="https://yourportfolio.com"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                    />
                    <p className="form-hint">🔍 We audit SEO, accessibility, content & performance</p>
                  </div>
                )}

                {/* Resume Upload */}
                {(activeMode !== "github_only" && activeMode !== "portfolio_only") && (
                  <div className="form-group">
                    <label className="form-label">
                      <span className="form-label-icon">📄</span>
                      Resume / CV
                      {activeMode === "resume_only" ? (
                        <span style={{ color: "var(--red)" }}> *</span>
                      ) : (
                        <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.78rem" }}> (optional, PDF)</span>
                      )}
                    </label>
                    {resumeFile ? (
                      <div className="resume-file-selected">
                        <span>✅</span>
                        <span style={{ flex: 1 }}>{resumeFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setResumeFile(null)}
                          style={{ color: "var(--txt-3)", fontSize: "0.8rem" }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`resume-dropzone ${dragOver ? "drag-over" : ""}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleResumeDrop}
                        onClick={() => fileRef.current?.click()}
                      >
                        <input
                          ref={fileRef}
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const f = e.target.files[0];
                            if (f) setResumeFile(f);
                          }}
                          style={{ display: "none" }}
                        />
                        <div className="resume-dropzone-icon">📎</div>
                        <div className="resume-dropzone-text">Drop PDF here or click to browse</div>
                        <div className="resume-dropzone-sub">Max 5MB · PDF only · ATS & keyword analysis</div>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="error-banner">⚠️ {error}</div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  <button id="analyze-btn" type="submit" className="btn-primary">
                    <span>Get My Hiring Score →</span>
                  </button>
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
                        setError(err.message);
                        setLoading(false);
                      });
                    }}
                    style={{
                      padding: "10px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                      color: "var(--cyan)",
                      fontWeight: 600,
                      fontSize: "0.83rem",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    ⚡ Try Live Sample Demo Report (1-Click)
                  </button>
                </div>
              </form>

              <p style={{ textAlign: "center", marginTop: 14, fontSize: "0.73rem", color: "var(--txt-3)" }}>
                🔒 Read-only GitHub access · Auto-synced every 5 mins · No data sold
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
