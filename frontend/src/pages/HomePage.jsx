import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeFullProfile, uploadResume } from "../services/apiService.js";
import LoadingScreen from "../components/LoadingScreen.jsx";

const ROLES = [
  { id: "frontend",  label: "Frontend",   icon: "🎨" },
  { id: "backend",   label: "Backend",    icon: "⚙️" },
  { id: "fullstack", label: "Full Stack", icon: "🔄" },
  { id: "devops",    label: "DevOps",     icon: "🚀" },
  { id: "mobile",    label: "Mobile",     icon: "📱" },
  { id: "aiml",      label: "AI/ML",      icon: "🧠" },
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
    if (!githubUsername.trim()) {
      setError("Please enter your GitHub username.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const result = await analyzeFullProfile({
        githubUsername: githubUsername.trim(),
        portfolioUrl: portfolioUrl.trim() || null,
        targetRole,
      });

      // Upload resume separately if provided
      if (resumeFile && result.shareId) {
        try {
          const formData = new FormData();
          formData.append("resume", resumeFile);
          formData.append("shareId", result.shareId);
          formData.append("targetRole", targetRole);
          const resumeResult = await uploadResume(formData);
          result.resumeAnalysis = resumeResult.resumeAnalysis;
        } catch (_) {
          // Non-critical — continue without resume
        }
      }

      sessionStorage.setItem("portfolioReport", JSON.stringify(result));
      navigate(`/results/${result.shareId}`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Analysis failed. Please try again.";
      setError(msg);
      setLoading(false);
    }
  }

  if (loading) return <LoadingScreen portfolioUrl={portfolioUrl} />;

  return (
    <div className="page-wrap">
      {/* Hero */}
      <div className="hero">
        <div className="hero-grid">
          {/* Left */}
          <div className="anim-fade-up">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              AI Career Intelligence Platform
            </div>

            <h1 className="hero-title">
              Know What Recruiters{" "}
              <span className="hero-title-grad">Actually See in 10 Seconds</span>
            </h1>

            <p className="hero-subtitle">
              Enter your GitHub username and get an AI-powered deep analysis — real scores with
              evidence, not random numbers. Know exactly what recruiters see and how to improve it.
            </p>

            <div className="hero-stats">
              <div className="hero-stat-item">
                <span className="hero-stat-value">5</span>
                <span className="hero-stat-label">Dimensions Analyzed</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-value">AI</span>
                <span className="hero-stat-label">Gemini Powered</span>
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
              <h2 className="analysis-card-title">Analyze Your Profile</h2>
              <p className="analysis-card-sub">
                15–30 seconds for new · Instant for cached · No login required
              </p>

              <form onSubmit={handleSubmit}>
                {/* GitHub */}
                <div className="form-group">
                  <label className="form-label" htmlFor="github-username">
                    <span className="form-label-icon">🐙</span>
                    GitHub Username <span style={{ color: "var(--red)" }}>*</span>
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
                  <p className="form-hint">💡 Just the username, not the full URL</p>
                </div>

                {/* Portfolio */}
                <div className="form-group">
                  <label className="form-label" htmlFor="portfolio-url">
                    <span className="form-label-icon">🌐</span>
                    Portfolio URL
                    <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.78rem" }}> (optional)</span>
                  </label>
                  <input
                    id="portfolio-url"
                    type="url"
                    className="form-input"
                    placeholder="https://yourportfolio.com"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                  />
                  <p className="form-hint">🔍 We audit SEO, accessibility, content & more</p>
                </div>

                {/* Target Role */}
                <div className="form-group">
                  <label className="form-label">
                    <span className="form-label-icon">🎯</span>
                    Target Role
                  </label>
                  <div className="role-selector">
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

                {/* Resume Upload */}
                <div className="form-group">
                  <label className="form-label">
                    <span className="form-label-icon">📄</span>
                    Resume / CV
                    <span style={{ color: "var(--txt-3)", fontWeight: 400, textTransform: "none", fontSize: "0.78rem" }}> (optional, PDF)</span>
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

                {error && (
                  <div className="error-banner">⚠️ {error}</div>
                )}

                <button id="analyze-btn" type="submit" className="btn-primary">
                  <span>Get My Hiring Score →</span>
                </button>
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
