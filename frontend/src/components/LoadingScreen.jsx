import { useState, useEffect } from "react";

const STEPS = [
  { icon: "🐙", label: "Fetching GitHub profile & repositories…" },
  { icon: "📊", label: "Analyzing commits, activity & contributions…" },
  { icon: "🌐", label: "Auditing portfolio website (SEO, accessibility)…" },
  { icon: "🤖", label: "Generating AI-powered insights & roadmap…" },
  { icon: "✨", label: "Building your personalized report…" },
];

export default function LoadingScreen({ portfolioUrl }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const intervals = [3000, 7000, 11000, 17000, 22000];
    const timers = intervals.map((delay, i) =>
      setTimeout(() => {
        setStep(i + 1);
        setProgress(((i + 1) / STEPS.length) * 100);
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const visibleSteps = portfolioUrl ? STEPS : STEPS.filter((_, i) => i !== 2);

  return (
    <div className="loading-screen">
      <div className="loading-card anim-fade-up">
        <div className="loading-logo">🔍</div>
        <h2 className="loading-title">Analyzing Your Profile</h2>
        <p className="loading-sub">
          Running {visibleSteps.length} checks across your entire developer presence…
        </p>

        <div className="loading-steps">
          {visibleSteps.map((s, i) => (
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
