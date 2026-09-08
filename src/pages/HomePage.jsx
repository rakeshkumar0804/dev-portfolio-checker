import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { analyzeFullProfile, uploadResume } from "../services/apiService.js";
import LoadingScreen from "../components/LoadingScreen.jsx";
import CareerSignalPreview from "../components/CareerSignalPreview.jsx";
import Icon from "../components/Icon.jsx";

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
  { id: "full_360",   label: "Full 360° Analysis", icon: "gem", desc: "GitHub + Portfolio + Resume" },
  { id: "github_only", label: "GitHub Only",     icon: "github", desc: "Repos & Code Quality" },
  { id: "portfolio_only", label: "Portfolio Only", icon: "globe", desc: "SEO, Speed & Structure" },
  { id: "resume_only", label: "Resume Only",    icon: "file-text", desc: "ATS & Keywords Score" },
  { id: "custom",     label: "Custom Combo",   icon: "sliders", desc: "Choose any inputs" },
];

const FEATURES = [
  "GitHub profile, repositories & activity",
  "Portfolio SEO, basic accessibility & speed",
  "AI-powered recommendations with estimated impact",
  "Recruiter 10-second scan heuristic",
  "Skill gap detection by target role",
  "Resume ATS compatibility check",
  "Career roadmap with weekly milestones",
  "Shareable public report link",
];

const ALL_HIRING_SIGNALS = [
  { category: "GitHub (6 Signals)", items: ["Commit Frequency & 90-Day Cadence", "README & Repository Completeness", "Repository Star & Fork Ratio", "PR & Issue Contribution Activity", "Repository Metadata Coverage", "Technology Stack Alignment"] },
  { category: "Portfolio (6 Signals)", items: ["SEO & Open Graph Meta Tags", "Response Time & Page Weight", "Mobile Responsiveness & Viewports", "HTTPS Security & SSL Setup", "Project Showcase & Live Demos", "UI Polish & Visual Hierarchy"] },
  { category: "Resume (5 Signals)", items: ["ATS Keyword & Role Alignment", "Quantified Impact Metrics (% / $)", "Section Hierarchy & Formatting", "Action Verb Density & Tone", "Contact & Portfolio Link Verification"] },
  { category: "Recruiter Engine (3 Signals)", items: ["Recruiter 10-Second Scan Heuristic", "Target Role Benchmark Alignment", "Evidence-Based Composite Hiring Score"] },
];

const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5MB

function isValidGithubUsername(val) {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  if (trimmed.length < 1 || trimmed.length > 39) return false;
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(trimmed);
}

function getGithubError(val, mode) {
  const trimmed = (val || "").trim();
  const isRequired = mode === "github_only" || mode === "full_360";
  if (!trimmed) {
    return isRequired ? "GitHub username is required." : "";
  }
  if (trimmed.length > 39) {
    return "GitHub username cannot exceed 39 characters.";
  }
  if (trimmed.startsWith("-") || trimmed.endsWith("-")) {
    return "GitHub username cannot begin or end with a hyphen.";
  }
  if (trimmed.includes("--")) {
    return "GitHub username cannot contain consecutive hyphens.";
  }
  if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return "GitHub username may only contain alphanumeric characters and single hyphens.";
  }
  if (!isValidGithubUsername(trimmed)) {
    return "Please enter a valid GitHub username.";
  }
  return "";
}

function isValidPortfolioUrl(val) {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

function getPortfolioError(val, mode) {
  const trimmed = (val || "").trim();
  const isRequired = mode === "portfolio_only" || mode === "full_360";
  if (!trimmed) {
    return isRequired ? "Portfolio URL is required." : "";
  }
  if (!isValidPortfolioUrl(trimmed)) {
    return "Please enter a valid URL starting with http:// or https://";
  }
  return "";
}

function validateResumeFile(file) {
  if (!file) return { valid: false, error: "Please upload a resume in PDF format." };
  const isPdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return { valid: false, error: "Only PDF files are accepted for resume upload." };
  }
  if (file.size > MAX_RESUME_SIZE) {
    return { valid: false, error: "Resume file size must be less than 5MB." };
  }
  return { valid: true, error: null };
}

export default function HomePage() {
  const navigate = useNavigate();
  const githubInputRef = useRef(null);
  const portfolioInputRef = useRef(null);
  const fileRef = useRef(null);

  const [activeMode, setActiveMode] = useState("full_360");
  const [githubUsername, setGithubUsername] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [targetRole, setTargetRole] = useState("fullstack");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeError, setResumeError] = useState("");
  const [touched, setTouched] = useState({ github: false, portfolio: false, resume: false, submit: false });
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAllSignals, setShowAllSignals] = useState(false);

  // API result state for two-phase loading screen
  const [apiResult, setApiResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(null);
  const isSubmittingRef = useRef(false);

  // Field visibility per selected scope mode
  const showGithub = activeMode !== "portfolio_only" && activeMode !== "resume_only";
  const showPortfolio = activeMode !== "github_only" && activeMode !== "resume_only";
  const showResume = activeMode !== "github_only" && activeMode !== "portfolio_only";

  // Individual field validity
  const isGithubValid = isValidGithubUsername(githubUsername);
  const isPortfolioValid = isValidPortfolioUrl(portfolioUrl);
  const isResumeValid = !!resumeFile && validateResumeFile(resumeFile).valid;

  // Mode requirements fulfillment
  let isFormValid = false;
  if (activeMode === "full_360") {
    isFormValid = isGithubValid && isPortfolioValid && isResumeValid;
  } else if (activeMode === "github_only") {
    isFormValid = isGithubValid;
  } else if (activeMode === "portfolio_only") {
    isFormValid = isPortfolioValid;
  } else if (activeMode === "resume_only") {
    isFormValid = isResumeValid;
  } else if (activeMode === "custom") {
    const validCount = (isGithubValid ? 1 : 0) + (isPortfolioValid ? 1 : 0) + (isResumeValid ? 1 : 0);
    isFormValid = validCount >= 2;
  }

  // Field error messages
  const githubError = (touched.github || touched.submit) ? getGithubError(githubUsername, activeMode) : "";
  const portfolioError = (touched.portfolio || touched.submit) ? getPortfolioError(portfolioUrl, activeMode) : "";
  const displayResumeError = resumeError || ((touched.resume || touched.submit) && (activeMode === "resume_only" || activeMode === "full_360") && !resumeFile ? "Please upload a resume in PDF format." : "");

  function handleSelectedResume(file) {
    setTouched((t) => ({ ...t, resume: true }));
    if (!file) return;
    const validation = validateResumeFile(file);
    if (!validation.valid) {
      setResumeFile(null);
      setResumeError(validation.error);
    } else {
      setResumeFile(file);
      setResumeError("");
    }
  }

  function handleResumeDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleSelectedResume(file);
  }

  async function runAnalysis() {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setApiResult(null);
    setApiError(null);
    setRetryAfterSeconds(null);

    try {
      let initialResumeResult = null;

      // Handle resume upload only if the active mode includes it and a valid file exists
      const shouldSubmitResume = showResume && isResumeValid;
      if (shouldSubmitResume && resumeFile) {
        try {
          const formData = new FormData();
          formData.append("resume", resumeFile);
          formData.append("targetRole", targetRole);
          const resResult = await uploadResume(formData);
          initialResumeResult = resResult.resumeAnalysis;
        } catch (resumeErr) {
          if (resumeErr.response?.status === 429) {
            throw resumeErr; // Halt immediately if rate limited; do not fire subsequent requests
          }
          console.warn("Resume parsing skipped or non-critical error");
        }
      }

      // Filter submitted values strictly based on activeMode
      const submitGithub = (showGithub && isGithubValid) ? githubUsername.trim() : null;
      const submitPortfolio = (showPortfolio && isPortfolioValid) ? portfolioUrl.trim() : null;

      const result = await analyzeFullProfile({
        githubUsername: submitGithub,
        portfolioUrl: submitPortfolio,
        targetRole,
        resumeAnalysis: initialResumeResult,
        analysisMode: activeMode,
      });

      sessionStorage.setItem("portfolioReport", JSON.stringify(result));
      setApiResult(result);
    } catch (err) {
      const status = err.response?.status;
      const isTimeout = status === 504 || err.code === "ECONNABORTED" || err.message?.toLowerCase().includes("timeout");
      const respMsg = err.response?.data?.message || "";
      const isSessionExpired =
        (status === 401 || status === 403) &&
        (respMsg.toLowerCase().includes("session") ||
         respMsg.toLowerCase().includes("sign in") ||
         respMsg.toLowerCase().includes("authentication"));

      let errorMsg;
      if (isSessionExpired) {
        localStorage.removeItem("saas_token");
        localStorage.removeItem("saas_user");
        errorMsg = "Your session has expired. You can continue as a guest or sign in again.";
      } else if (isTimeout) {
        errorMsg = "Analysis took longer than expected. Please retry in a moment.";
      } else if (!err.response) {
        errorMsg = "The backend API server is connecting. Please try again in a moment.";
      } else if (status === 502 || status === 503) {
        errorMsg = respMsg || "Upstream service temporarily unavailable. Please retry in a moment.";
      } else if (status === 404) {
        errorMsg = respMsg || "The requested profile was not found. Please verify your inputs.";
      } else if (status === 429) {
        const retryHeader = err.response?.headers?.["retry-after"] || err.response?.headers?.get?.("retry-after");
        let retrySec = retryHeader ? parseInt(retryHeader, 10) : null;
        if (isNaN(retrySec) || retrySec <= 0) retrySec = null;
        setRetryAfterSeconds(retrySec);
        errorMsg = respMsg || "Too many requests. Please try again shortly.";
      } else {
        errorMsg = respMsg || (status >= 500 ? "Analysis temporarily unavailable. Please try again." : "Please check your inputs and try again.");
      }
      setApiError(errorMsg);
    } finally {
      isSubmittingRef.current = false;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || isSubmittingRef.current) return;
    setError("");

    if (!isFormValid) {
      setTouched({ github: true, portfolio: true, resume: true, submit: true });
      if (showGithub && !isGithubValid) {
        githubInputRef.current?.focus();
      } else if (showPortfolio && !isPortfolioValid) {
        portfolioInputRef.current?.focus();
      } else if (showResume && !isResumeValid) {
        fileRef.current?.focus();
      }
      return;
    }

    setLoading(true);
    runAnalysis();
  }

  function handleLoadingComplete() {
    if (apiResult) {
      navigate(`/results/${apiResult.shareId}`);
    }
    setLoading(false);
  }

  function handleLoadingRetry() {
    setApiResult(null);
    setApiError(null);
    setRetryAfterSeconds(null);
    runAnalysis();
  }

  function handleContinueAsGuest() {
    localStorage.removeItem("saas_token");
    localStorage.removeItem("saas_user");
    setApiResult(null);
    setApiError(null);
    setRetryAfterSeconds(null);
    runAnalysis();
  }

  function handleLoadingSignIn() {
    try {
      sessionStorage.setItem(
        "pending_analysis_inputs",
        JSON.stringify({
          activeMode,
          githubUsername,
          portfolioUrl,
          targetRole,
        })
      );
    } catch (_) {}
    navigate("/auth");
  }

  function handleLoadingCancel() {
    isSubmittingRef.current = false;
    setLoading(false);
    setApiResult(null);
    setApiError(null);
    setRetryAfterSeconds(null);
    if (apiError) setError(apiError);
  }

  if (loading) {
    return (
      <LoadingScreen
        githubUsername={showGithub && isGithubValid ? githubUsername : null}
        portfolioUrl={showPortfolio && isPortfolioValid ? portfolioUrl : null}
        resumeFile={showResume && isResumeValid ? resumeFile : null}
        apiDone={!!apiResult || !!apiError}
        apiError={apiError}
        retryAfterSeconds={retryAfterSeconds}
        onComplete={handleLoadingComplete}
        onRetry={handleLoadingRetry}
        onContinueGuest={handleContinueAsGuest}
        onSignIn={handleLoadingSignIn}
        onCancel={handleLoadingCancel}
      />
    );
  }

  return (
    <main className="page-wrap" id="main-content">
      {/* Hero */}
      <div className="hero">
        <div className="hero-grid">
          {/* Left Column — Clean 3-Stage Hierarchy */}
          <div className="anim-fade-up">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              AI Technical Hiring Intelligence
            </div>

            <h1 className="hero-title">
              Know What Recruiters{" "}
              <span className="hero-title-grad">Actually See in 10 Seconds</span>
            </h1>

            <p className="hero-subtitle">
              Analyze your GitHub, portfolio, and resume against 20 hiring signals to uncover recruiter insights, evidence-based scores, and actionable recommendations.
            </p>

            {/* Integrated Evidence Engine Card */}
            <div className="evidence-engine-card">
              <div className="evidence-card-header">
                <div className="evidence-card-title" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Icon name="eye" size={15} /> Hiring signals
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "var(--txt-3)", fontWeight: 500 }}>
                    Previewing 4 of 20 hiring signals
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllSignals(!showAllSignals)}
                  className="evidence-status-pill"
                  style={{ cursor: "pointer", border: "1px solid rgba(56, 189, 248, 0.3)", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  {showAllSignals ? (
                    <>Hide Full List <Icon name="chevron-up" size={12} /></>
                  ) : (
                    <>View All 20 Hiring Signals <Icon name="chevron-down" size={12} /></>
                  )}
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
                    <span className="evidence-icon"><Icon name="check-circle" size={14} /></span>
                    <span className="evidence-text">GitHub Activity & Commit Consistency</span>
                    <span className="evidence-badge pass">Excellent</span>
                  </div>
                  <div className="evidence-item pass">
                    <span className="evidence-icon"><Icon name="check" size={14} /></span>
                    <span className="evidence-text">README & Repository Completeness</span>
                    <span className="evidence-badge pass">Strong</span>
                  </div>
                  <div className="evidence-item info">
                    <span className="evidence-icon"><Icon name="globe" size={14} /></span>
                    <span className="evidence-text">Portfolio SEO & Response Time</span>
                    <span className="evidence-badge info">Moderate</span>
                  </div>
                  <div className="evidence-item warn">
                    <span className="evidence-icon"><Icon name="alert-triangle" size={14} /></span>
                    <span className="evidence-text">ATS Resume Keywords & Optimization</span>
                    <span className="evidence-badge warn">Needs Attention</span>
                  </div>
                </div>
              )}

              <div className="evidence-card-footer">
                <span>Uses Public GitHub Data</span>
                <span>•</span>
                <span>No GitHub Login Required</span>
                <span>•</span>
                <span>Free Technical Assessment</span>
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
                  <div
                    className="mode-selector-grid"
                    role="radiogroup"
                    aria-label="Analysis scope"
                  >
                    {MODES.map((m, idx) => (
                      <button
                        key={m.id}
                        id={`scope-${m.id}`}
                        type="button"
                        role="radio"
                        aria-checked={activeMode === m.id}
                        tabIndex={activeMode === m.id ? 0 : -1}
                        className={`role-btn ${activeMode === m.id ? "active" : ""}`}
                        style={{ fontSize: "0.76rem", padding: "6px 10px" }}
                        onClick={() => setActiveMode(m.id)}
                        onKeyDown={(e) => {
                          let nextIdx = null;
                          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                            e.preventDefault();
                            nextIdx = (idx + 1) % MODES.length;
                          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                            e.preventDefault();
                            nextIdx = (idx - 1 + MODES.length) % MODES.length;
                          }
                          if (nextIdx !== null) {
                            setActiveMode(MODES[nextIdx].id);
                            const btns = e.currentTarget.parentElement?.querySelectorAll('button[role="radio"]');
                            btns?.[nextIdx]?.focus();
                          }
                        }}
                      >
                        <Icon name={m.icon} size={14} style={{ marginRight: 6 }} /> {m.label}
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
                  <div
                    className="role-choice-row"
                    role="radiogroup"
                    aria-label="Target role selection"
                  >
                    {ROLES.slice(0, 3).map((role, idx) => (
                      <button
                        key={role.id}
                        type="button"
                        role="radio"
                        aria-checked={targetRole === role.id}
                        tabIndex={targetRole === role.id ? 0 : -1}
                        className={`role-btn ${targetRole === role.id ? "active" : ""}`}
                        onClick={() => setTargetRole(role.id)}
                        onKeyDown={(e) => {
                          let nextIdx = null;
                          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                            e.preventDefault();
                            nextIdx = (idx + 1) % 3;
                          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                            e.preventDefault();
                            nextIdx = (idx - 1 + 3) % 3;
                          }
                          if (nextIdx !== null) {
                            setTargetRole(ROLES.slice(0, 3)[nextIdx].id);
                            const btns = e.currentTarget.parentElement?.querySelectorAll('button[role="radio"]');
                            btns?.[nextIdx]?.focus();
                          }
                        }}
                      >
                        {role.label}
                      </button>
                    ))}
                    <select
                      id="more-roles-select"
                      className={`role-more-select ${!ROLES.slice(0, 3).some((role) => role.id === targetRole) && targetRole ? "active" : ""}`}
                      aria-label="Choose another target role"
                      value={ROLES.slice(0, 3).some((role) => role.id === targetRole) ? "" : targetRole}
                      onChange={(e) => e.target.value && setTargetRole(e.target.value)}
                    >
                      <option value="">More roles</option>
                      {ROLES.slice(3).map((role) => (
                        <option key={role.id} value={role.id}>{role.label}</option>
                      ))}
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

                  {activeMode === "full_360" && (
                    <p className="form-hint" style={{ color: "var(--cyan)", marginTop: -4, marginBottom: 14 }}>
                      Add all three sources for a complete 360° analysis.
                    </p>
                  )}
                  {activeMode === "custom" && (
                    <p className="form-hint" style={{ color: "var(--cyan)", marginTop: -4, marginBottom: 14 }}>
                      Add any two sources to create a combined analysis.
                    </p>
                  )}

                  {/* GitHub Username */}
                  {showGithub && (
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label className="form-label" htmlFor="github-username">
                        <span className="form-label-icon" aria-hidden="true"><Icon name="github" size={15} /></span>
                        GitHub Username
                        {activeMode === "github_only" || activeMode === "full_360" ? (
                          <span style={{ color: "var(--red)" }} aria-hidden="true"> *</span>
                        ) : activeMode === "custom" ? (
                          <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.76rem" }}> (any 2 required)</span>
                        ) : (
                          <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.76rem" }}> (optional)</span>
                        )}
                      </label>
                      <input
                        id="github-username"
                        ref={githubInputRef}
                        type="text"
                        className="form-input"
                        placeholder="e.g. torvalds"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, github: true }))}
                        autoComplete="off"
                        spellCheck="false"
                        aria-required={activeMode === "github_only" || activeMode === "full_360"}
                        aria-invalid={!!githubError}
                        aria-describedby={githubError ? "github-error github-hint" : "github-hint"}
                        style={githubError ? { borderColor: "var(--red, #f87171)" } : undefined}
                      />
                      <p id="github-hint" className="form-hint">
                        <Icon name="info" size={12} style={{ marginRight: 4 }} /> Just the username, e.g. rakeshkumar0804
                      </p>
                      {githubError && (
                        <p id="github-error" role="alert" style={{ fontSize: "0.74rem", color: "var(--red)", marginTop: 4, marginBottom: 0 }}>
                          {githubError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Portfolio URL */}
                  {showPortfolio && (
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label className="form-label" htmlFor="portfolio-url">
                        <span className="form-label-icon" aria-hidden="true"><Icon name="globe" size={15} /></span>
                        Portfolio URL
                        {activeMode === "portfolio_only" || activeMode === "full_360" ? (
                          <span style={{ color: "var(--red)" }} aria-hidden="true"> *</span>
                        ) : activeMode === "custom" ? (
                          <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.76rem" }}> (any 2 required)</span>
                        ) : (
                          <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.76rem" }}> (optional)</span>
                        )}
                      </label>
                      <input
                        id="portfolio-url"
                        ref={portfolioInputRef}
                        type="url"
                        className="form-input"
                        placeholder="https://yourportfolio.com"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, portfolio: true }))}
                        aria-required={activeMode === "portfolio_only" || activeMode === "full_360"}
                        aria-invalid={!!portfolioError}
                        aria-describedby={portfolioError ? "portfolio-error portfolio-hint" : "portfolio-hint"}
                        style={portfolioError ? { borderColor: "var(--red, #f87171)" } : undefined}
                      />
                      <p id="portfolio-hint" className="form-hint">
                        <Icon name="search" size={12} style={{ marginRight: 4 }} /> Checks SEO, image alt tags, HTTPS, and response time.
                      </p>
                      {portfolioError && (
                        <p id="portfolio-error" role="alert" style={{ fontSize: "0.74rem", color: "var(--red)", marginTop: 4, marginBottom: 0 }}>
                          {portfolioError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Resume Upload */}
                  {showResume && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="resume-file-input">
                        <span className="form-label-icon" aria-hidden="true"><Icon name="file-text" size={15} /></span>
                        Resume / CV
                        {activeMode === "resume_only" || activeMode === "full_360" ? (
                          <span style={{ color: "var(--red)" }} aria-hidden="true"> *</span>
                        ) : activeMode === "custom" ? (
                          <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.76rem" }}> (any 2 required)</span>
                        ) : (
                          <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.76rem" }}> (optional, PDF)</span>
                        )}
                      </label>
                      {resumeFile ? (
                        <div className="resume-file-selected" role="status" aria-live="polite">
                          <Icon name="check-circle" size={16} />
                          <span style={{ flex: 1 }}>{resumeFile.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setResumeFile(null);
                              setResumeError("");
                            }}
                            aria-label={`Remove selected resume file ${resumeFile.name}`}
                            style={{ color: "var(--txt-3)", fontSize: "0.8rem", cursor: "pointer", background: "none", border: "none" }}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`resume-dropzone ${dragOver ? "drag-over" : ""}`}
                          role="button"
                          tabIndex={0}
                          aria-label="Upload resume PDF. Drag and drop file here or press Enter to browse"
                          aria-describedby={displayResumeError ? "resume-error resume-hint" : "resume-hint"}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              fileRef.current?.click();
                            }
                          }}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleResumeDrop}
                          onClick={() => fileRef.current?.click()}
                          style={displayResumeError ? { borderColor: "var(--red, #f87171)" } : undefined}
                        >
                          <input
                            id="resume-file-input"
                            ref={fileRef}
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleSelectedResume(f);
                              e.target.value = "";
                            }}
                            style={{ display: "none" }}
                            aria-describedby={displayResumeError ? "resume-error resume-hint" : "resume-hint"}
                          />
                          <div className="resume-dropzone-icon" aria-hidden="true"><Icon name="file-text" size={24} /></div>
                          <div className="resume-dropzone-text">Drop your resume here or browse</div>
                          <div id="resume-hint" className="resume-dropzone-sub">Max 5MB · PDF format · ATS keyword analysis</div>
                        </div>
                      )}
                      {displayResumeError && (
                        <p id="resume-error" role="alert" style={{ fontSize: "0.74rem", color: "var(--red)", marginTop: 6, marginBottom: 0 }}>
                          {displayResumeError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-divider" />

                {error && (
                  <div className="error-banner" role="alert" aria-live="assertive">
                    <span aria-hidden="true"><Icon name="alert-triangle" size={14} style={{ marginRight: 6 }} /></span> {error}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  <button
                    id="analyze-btn"
                    type="submit"
                    className="btn-primary"
                    disabled={loading || !isFormValid}
                    aria-disabled={loading || !isFormValid}
                  >
                    <span>Get My Hiring Score</span>
                    <Icon name="arrow-right" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/sample-report");
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
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <Icon name="zap" size={14} /> View Sample Report
                  </button>
                </div>
                <div className="form-trust"><Icon name="shield" size={13} style={{ marginRight: 4 }} /> Uses public GitHub data — we never request your GitHub credentials.</div>
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
            <p>Deterministic scoring evaluates public evidence from your GitHub, portfolio, and resume. AI generates personalized feedback and roadmaps, but does not invent the underlying score.</p>
            <div className="features-list compact-features">
              {FEATURES.slice(0, 4).map((feature, i) => <div key={i} className="feature-item"><div className="feature-item-dot" /><span>{feature}</span></div>)}
            </div>
          </div>
          <CareerSignalPreview />
        </div>
      </section>
      <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 0", marginTop: "40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", fontSize: "0.8rem", color: "var(--txt-3)" }}>
          <span>PortfolioPulse · Technical Hiring Intelligence</span>
          <Link to="/privacy" style={{ color: "var(--txt-2)", textDecoration: "none", fontSize: "0.8rem" }}>
            Privacy
          </Link>
        </div>
      </footer>
    </main>
  );
}
