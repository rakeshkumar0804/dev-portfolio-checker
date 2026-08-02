import { useState, useEffect } from "react";

export default function LoadingScreen({ githubUsername, portfolioUrl, resumeFile }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [];
  if (githubUsername) {
    steps.push({ icon: "🐙", label: "Fetching GitHub profile & repositories…" });
    steps.push({ icon: "📊", label: "Analyzing commits, activity & contributions…" });
  }
  if (portfolioUrl) {
    steps.push({ icon: "🌐", label: "Auditing portfolio website (SEO, accessibility)…" });
  }
  if (resumeFile) {
    steps.push({ icon: "📄", label: "Analyzing resume PDF & ATS keywords…" });
  }
  steps.push({ icon: "🤖", label: "Generating AI-powered insights & roadmap…" });
  steps.push({ icon: "✨", label: "Building your personalized report…" });

  useEffect(() => {
    const stepDuration = 2500;
    const timers = steps.map((_, i) =>
      setTimeout(() => {
        setStep(i + 1);
        setProgress(((i + 1) / steps.length) * 100);
      }, (i + 1) * stepDuration)
    );
    return () => timers.forEach(clearTimeout);
  }, [steps.length]);

  return (
    <div className="loading-screen">
      <div className="loading-card anim-fade-up">
        <div className="loading-logo">🔍</div>
        <h2 className="loading-title">Analyzing Your Profile</h2>
        <p className="loading-sub">
          Running {steps.length} tailored checks across your selected inputs…
        </p>

        <div className="loading-steps">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`loading-step ${i < step ? "done" : i === step ? "active" : ""}`}
            >
              <span className="loading-step-icon">
                {i < step ? "✅" : i === step ? "⏳" : s.icon}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="loading-progress">
          <div className="loading-progress-bar">
            <div
              className="loading-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontSize: "0.75rem",
              color: "var(--txt-3)",
            }}
          >
            <span>Analyzing…</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
