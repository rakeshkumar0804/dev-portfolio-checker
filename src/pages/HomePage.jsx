import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeFullProfile, uploadResume } from "../services/apiService.js";
import LoadingScreen from "../components/LoadingScreen.jsx";
import CareerSignalPreview from "../components/CareerSignalPreview.jsx";

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
  { id: "mobile",       label: "Mobile",       icon: "📱" },
];

const MODES = [
  { id: "full_360",   label: "Full 360° Analysis", icon: "💎", desc: "GitHub + Portfolio + Resume" },
  { id: "github_only", label: "GitHub Only",     icon: "🐙", desc: "Repos & Code Quality" },
  { id: "portfolio_only", label: "Portfolio Only", icon: "🌐", desc: "SEO, Vitals & UI Analysis" },
  { id: "resume_only", label: "Resume Only",    icon: "📄", desc: "ATS & Keywords Score" },
  { id: "custom",     label: "Custom Combo",   icon: "⚡", desc: "Choose any inputs" },
];

const FEATURES = [
  "GitHub profile, repositories & activity",
  "Portfolio SEO, accessibility & performance",
  "Rule-based recommendations with estimated impact",
  "Recruiter 10-second review",
  "Skill gap detection by target role",
  "Resume ATS compatibility check",
  "Career roadmap with weekly milestones",
  "Shareable public report link",
];

const ALL_HIRING_SIGNALS = [
  { category: "GitHub (6 Signals)", items: ["Commit Frequency & 90-Day Cadence", "README Quality & Architecture Depth", "Repository Star & Fork Ratio", "PR & Issue Contribution Activity", "Code Test Coverage & CI Workflows", "Technology Stack Alignment"] },
  { category: "Portfolio (6 Signals)", items: ["SEO & Open Graph Meta Tags", "Core Web Vitals & Page Speed", "Mobile Responsiveness & Viewports", "HTTPS Security & SSL Setup", "Project Showcase & Live Demos", "UI Polish & Visual Hierarchy"] },
  { category: "Resume (5 Signals)", items: ["ATS Keyword & Role Alignment", "Quantified Impact Metrics (% / $)", "Section Hierarchy & Formatting", "Action Verb Density & Tone", "Contact & Portfolio Link Verification"] },
  { category: "Recruiter Engine (3 Signals)", items: ["Recruiter 10-Second Eye-Tracking Simulation", "Target Role Benchmark Alignment", "Evidence-Based Composite Hiring Score"] },
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
  const [showAllSignals, setShowAllSignals] = useState(false);

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
      if (!err.response) {
        setError("The backend API server is connecting. Please click 'Get My Hiring Score →' again in a moment.");
      } else {
        const msg = err.response?.data?.message || (err.response.status === 500 ? "Analysis temporarily unavailable. Please try again." : err.message);
        setError(msg);
      }
      setLoading(false);
    }
  }

  if (loading) return <LoadingScreen githubUsername={githubUsername} portfolioUrl={portfolioUrl} resumeFile={resumeFile} />;

  return (
    <div className="page-wrap">
      {/* Hero */}
      <div className="hero">
        <div className="hero-grid">
          {/* Left Column — Clean 3-Stage Hierarchy */}
          <div className="anim-fade-up">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Evidence-Based Hiring Intelligence
            </div>

            <h1 className="hero-title">
              Know What Recruiters{" "}
              <span className="hero-title-grad">Actually See in 10 Seconds</span>
            </h1>

            <p className="hero-subtitle">
              Analyze your GitHub, portfolio, and resume against 20+ hiring signals to uncover recruiter insights, evidence-based scores, and actionable recommendations.
            </p>

            {/* Integrated Evidence Engine Card */}
            <div className="evidence-engine-card">
              <div className="evidence-card-header">
                <div className="evidence-card-title" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>👁️ Hiring signals</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--txt-3)", fontWeight: 500 }}>
                    4 of 20+ signals evaluated
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllSignals(!showAllSignals)}
                  className="evidence-status-pill"
                  style={{ cursor: "pointer", border: "1px solid rgba(56, 189, 248, 0.3)" }}
                >
                  {showAllSignals ? "Hide Full List ▲" : "View All 20+ Hiring Signals ▼"}
                </button>
              </div>

              {/* Expandable 20+ Signals List */}
              {showAllSignals ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "10px 0 14px", padding: 12, background: "rgba(0,0,0,0.3)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                  {ALL_HIRING_SIGNALS.map((cat, idx) => (
                    <div key={idx} style={{ fontSize: "0.74rem" }}>
                      <strong style={{ color: "var(--cyan)", display: "block", marginBottom: 4 }}>{cat.category}</strong>
                      <ul style={{ paddingLeft: 14, margin: 0, color: "var(--txt-2)", lineHeight: 1.5 }}>
                        {cat.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="evidence-signals-list">
                  <div className="evidence-item pass">
                    <span className="evidence-icon">✅</span>
                    <span className="evidence-text">GitHub Activity & Commit Consistency</span>
                    <span className="evidence-badge pass">Excellent</span>
                  </div>
                  <div className="evidence-item pass">
                    <span className="evidence-icon">✓</span>
                    <span className="evidence-text">README Quality & Architecture</span>
                    <span className="evidence-badge pass">Strong</span>
                  </div>
                  <div className="evidence-item info">
                    <span className="evidence-icon">🌐</span>
                    <span className="evidence-text">Portfolio SEO & Core Web Vitals</span>
                    <span className="evidence-badge info">Moderate</span>
                  </div>
                  <div className="evidence-item warn">
                    <span className="evidence-icon">⚠️</span>
                    <span className="evidence-text">ATS Resume Keywords & Optimization</span>
                    <span className="evidence-badge warn">Needs Attention</span>
                  </div>
                </div>
              )}

              <div className="evidence-card-footer">
                <span>🔒 Read-Only GitHub Access</span>
                <span>•</span>
                <span>We Never Store Credentials</span>
                <span>•</span>
                <span>Free Instant Assessment</span>
              </div>
            </div>
          </div>

          {/* Right Column — Compact Structured Analysis Card */}
          <div className="anim-fade-up anim-delay-2">
            <div className="analysis-card">
              <div className="analysis-card-header">
                <h2 className="analysis-card-title">Analyze your profile</h2>
                <span className="card-step-count">Free Analysis</span>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Step 1: Audit Scope */}
                <div className="form-wizard-section">
                  <div className="wizard-section-title">
                    <span className="wizard-step-num">1</span>
                    <span>SELECT SCOPE</span>
                  </div>
                  <div className="mode-selector-grid">
                    {MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`role-btn ${activeMode === m.id ? "active" : ""}`}
                        style={{ fontSize: "0.76rem", padding: "6px 10px" }}
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
                </div>

                <div className="form-divider" />

                {/* Step 2: Target Role */}
                <div className="form-wizard-section">
                  <div className="wizard-section-title">
                    <span className="wizard-step-num">2</span>
                    <span>TARGET ROLE</span>
                  </div>
                  <div className="role-choice-row">
                    {ROLES.slice(0, 3).map((role) => (
                      <button key={role.id} type="button" className={`role-btn ${targetRole === role.id ? "active" : ""}`} onClick={() => setTargetRole(role.id)}>
                        {role.label}
                      </button>
                    ))}
                    <select className="role-more-select" aria-label="Choose another target role" value={ROLES.slice(0, 3).some((role) => role.id === targetRole) ? "" : targetRole} onChange={(e) => e.target.value && setTargetRole(e.target.value)}>
                      <option value="">More roles</option>
                      {ROLES.slice(3).map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-divider" />

                {/* Step 3: Input Sources */}
                <div className="form-wizard-section">
                  <div className="wizard-section-title">
                    <span className="wizard-step-num">3</span>
                    <span>PROFILE SOURCES</span>
                  </div>

                  {/* GitHub Username */}
                  {(activeMode !== "portfolio_only" && activeMode !== "resume_only") && (
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label className="form-label" htmlFor="github-username">
                        <span className="form-label-icon">🐙</span>
                        GitHub Username
                        {activeMode === "github_only" ? (
                          <span style={{ color: "var(--red)" }}> *</span>
                        ) : (
                          <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.76rem" }}> (optional)</span>
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
                      <p className="form-hint">💡 Just the username, e.g. rakeshkumar0804</p>
                    </div>
                  )}

                  {/* Portfolio URL */}
                  {(activeMode !== "github_only" && activeMode !== "resume_only") && (
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label className="form-label" htmlFor="portfolio-url">
                        <span className="form-label-icon">🌐</span>
                        Portfolio URL
                        {activeMode === "portfolio_only" ? (
                          <span style={{ color: "var(--red)" }}> *</span>
                        ) : (
                          <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.76rem" }}> (optional)</span>
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
                      <p className="form-hint">🔍 Checks SEO, accessibility, HTTPS, and performance.</p>
                    </div>
                  )}

                  {/* Resume Upload */}
                  {(activeMode !== "github_only" && activeMode !== "portfolio_only") && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        <span className="form-label-icon">📄</span>
                        Resume / CV
                        {activeMode === "resume_only" ? (
                          <span style={{ color: "var(--red)" }}> *</span>
                        ) : (
                          <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.76rem" }}> (optional, PDF)</span>
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
                          <div className="resume-dropzone-text">Drop your resume here or browse</div>
                          <div className="resume-dropzone-sub">Max 5MB · PDF format · ATS keyword analysis</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-divider" />

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
                        setError(err.response?.data?.message || err.message || "Sample analysis failed. Please try again.");
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
                    View Sample Report
                  </button>
                </div>
                <div className="form-trust"><span>🔒</span> Read-only GitHub access — we never request your credentials.</div>
              </form>

            </div>
          </div>
        </div>
        <div className="hero-bottom-glow-bar" />
      </div>
      <section className="proof-section">
        <div className="proof-section-inner">
          <div className="proof-copy">
            <span className="signal-eyebrow">Built for the recruiter scan</span>
            <h2>See the proof behind every score.</h2>
            <p>PortfolioPulse transforms scattered public signals into an evidence-backed career narrative, helping you understand exactly what to improve next.</p>
            <div className="features-list compact-features">
              {FEATURES.slice(0, 4).map((feature, i) => <div key={i} className="feature-item"><div className="feature-item-dot" /><span>{feature}</span></div>)}
            </div>
          </div>
          <CareerSignalPreview />
        </div>
      </section>
    </div>
  );
}
