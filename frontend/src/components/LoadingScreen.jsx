import { useState, useEffect } from "react";

export default function LoadingScreen({ githubUsername, portfolioUrl, resumeFile }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);

  const pipelineSteps = [
    { id: "github_connect", label: "Connecting GitHub API & sync status...", icon: "⚡" },
    { id: "github_repos",   label: "Reading repositories & commit frequency...", icon: "🐙" },
    { id: "tech_stack",     label: "Detecting technologies & language distribution...", icon: "⚙️" },
    { id: "docs_audit",     label: "Evaluating README documentation quality...", icon: "📝" },
    { id: "portfolio_scan", label: "Scanning portfolio SEO, vital metrics & HTTPS...", icon: "🌐" },
    { id: "ats_check",       label: "Checking ATS resume keyword compatibility...", icon: "📄" },
    { id: "recruiter_sim",  label: "Simulating 10-second technical recruiter scan...", icon: "🔍" },
    { id: "roadmap_gen",    label: "Generating weekly score growth roadmap...", icon: "🎯" },
    { id: "final_report",   label: "Preparing executive candidate report...", icon: "💎" },
  ];

  const filteredSteps = pipelineSteps.filter((s) => {
    if (s.id === "portfolio_scan" && !portfolioUrl) return false;
    if (s.id === "ats_check" && !resumeFile) return false;
    return true;
  });

  useEffect(() => {
    const totalDurationMs = 12000;
    const intervalMs = Math.floor(totalDurationMs / filteredSteps.length);

    const stepTimer = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < filteredSteps.length - 1) return prev + 1;
        clearInterval(stepTimer);
        return prev;
      });
    }, intervalMs);

    const countdownTimer = setInterval(() => {
      setTimeLeft((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    return () => {
      clearInterval(stepTimer);
      clearInterval(countdownTimer);
    };
  }, [filteredSteps.length]);

  const progressPercent = Math.min(100, Math.round(((stepIndex + 1) / filteredSteps.length) * 100));

  return (
    <div className="loading-screen" style={{ background: "rgba(2, 8, 16, 0.95)", backdropFilter: "blur(20px)", zIndex: 1000 }}>
      <div
        className="loading-card anim-fade-up"
        style={{
          maxWidth: 540,
          padding: "36px 32px",
          background: "linear-gradient(145deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.9) 100%)",
          borderRadius: 24,
          border: "1px solid rgba(56, 189, 248, 0.25)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(56,189,248,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              🤖
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "var(--txt-1)", letterSpacing: "-0.02em" }}>
                AI Hiring Assessment Pipeline
              </h2>
              <span style={{ fontSize: "0.78rem", color: "var(--cyan)", fontWeight: 600 }}>
                Simulating Recruiter Audit · ~{timeLeft}s remaining
              </span>
            </div>
          </div>
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 800,
              color: "var(--cyan)",
              background: "rgba(56, 189, 248, 0.1)",
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid rgba(56, 189, 248, 0.2)",
            }}
          >
            {progressPercent}%
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 24 }}>
          <div
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              background: "linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)",
              borderRadius: 3,
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {/* Pipeline Step List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {filteredSteps.map((s, idx) => {
            const isDone = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: isCurrent ? "rgba(56, 189, 248, 0.12)" : isDone ? "rgba(34, 197, 94, 0.05)" : "transparent",
                  border: `1px solid ${isCurrent ? "rgba(56, 189, 248, 0.3)" : "transparent"}`,
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ width: 22, fontSize: "0.95rem", textAlign: "center" }}>
                  {isDone ? (
                    <span style={{ color: "var(--green)" }}>✓</span>
                  ) : isCurrent ? (
                    <span className="anim-pulse-glow" style={{ color: "var(--cyan)" }}>
                      ⏳
                    </span>
                  ) : (
                    <span style={{ opacity: 0.4 }}>{s.icon}</span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: isCurrent ? 700 : isDone ? 500 : 400,
                    color: isCurrent ? "var(--cyan)" : isDone ? "var(--txt-2)" : "var(--txt-3)",
                  }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
