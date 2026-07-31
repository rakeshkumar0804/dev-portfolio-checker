import { useState } from "react";

const DIFF_CLASS = {
  Easy:   "badge-easy",
  Medium: "badge-medium",
  Hard:   "badge-hard",
};

const PRI_CLASS = { 1: "pri-1", 2: "pri-2", 3: "pri-3", 4: "pri-4" };

export default function ImprovementCard({ item, index }) {
  const [open, setOpen] = useState(false);

  const howSteps = (item.how || "").split("\n").filter((s) => s.trim());

  return (
    <div className="improvement-card anim-fade-up" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="improvement-card-header" onClick={() => setOpen((o) => !o)}>
        <div className={`improvement-priority-badge ${PRI_CLASS[item.priority] || "pri-4"}`}>
          #{index + 1}
        </div>

        <div className="improvement-meta">
          <div className="improvement-title">{item.action}</div>
          <div className="improvement-badges">
            <span className="badge badge-points">+{item.points} pts</span>
            <span className={`badge ${DIFF_CLASS[item.difficulty] || "badge-medium"}`}>
              {item.difficulty}
            </span>
            {item.timeMinutes > 0 && (
              <span className="badge badge-time">⏱ {item.timeMinutes} min</span>
            )}
          </div>
        </div>

        <span className={`improvement-expand-icon ${open ? "open" : ""}`}>▼</span>
      </div>

      {open && (
        <div className="improvement-detail">
          {item.why && (
            <div className="improvement-section">
              <div className="improvement-section-title">💡 Why this matters</div>
              <div className="improvement-section-text">{item.why}</div>
            </div>
          )}
          {item.how && (
            <div className="improvement-section">
              <div className="improvement-section-title">🛠 How to fix it</div>
              {howSteps.length > 1 ? (
                <div className="improvement-how-steps">
                  {howSteps.map((step, i) => (
                    <div key={i} className="improvement-how-step">
                      {step.replace(/^\d+\.\s*/, "")}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="improvement-section-text">{item.how}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
