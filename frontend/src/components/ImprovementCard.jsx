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
  const impactLabel = item.points >= 15 ? "High Recruiter Impact" : item.points >= 8 ? "Medium Recruiter Impact" : "Quick Win";
  const confidence = item.confidenceLevel || "High Confidence";
  const affectedRepos = item.affectedRepos || [];
  const affectedResumeSection = item.affectedResumeSection || "Public Profile";

  return (
    <div className="improvement-card anim-fade-up" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="improvement-card-header" onClick={() => setOpen((o) => !o)}>
        <div className={`improvement-priority-badge ${PRI_CLASS[item.priority] || "pri-4"}`}>
          #{index + 1}
        </div>

        <div className="improvement-meta">
          <div className="improvement-title">{item.action}</div>
          <div className="improvement-badges" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <span className="badge badge-points">+{item.points} Score Points</span>
            <span className="badge" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
              {impactLabel}
            </span>
            <span className={`badge ${DIFF_CLASS[item.difficulty] || "badge-medium"}`}>
              {item.difficulty} Effort
            </span>
            {item.timeMinutes > 0 && (
              <span className="badge badge-time">⏱ Est. {item.timeMinutes} min</span>
            )}
            <span className="badge" style={{ background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.25)" }}>
              ✓ {confidence}
            </span>
          </div>
        </div>

        <span className={`improvement-expand-icon ${open ? "open" : ""}`}>▼</span>
      </div>

      {open && (
        <div className="improvement-detail">
          {/* Affected Target Metadata */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--border)", fontSize: "0.78rem" }}>
            <div>
              📦 <strong style={{ color: "var(--txt-3)" }}>Affected Repositories:</strong>{" "}
              <span style={{ color: "var(--txt-1)", fontWeight: 600 }}>{affectedRepos.join(", ") || "GitHub Repositories"}</span>
            </div>
            <div>
              📄 <strong style={{ color: "var(--txt-3)" }}>Target Section:</strong>{" "}
              <span style={{ color: "var(--txt-1)", fontWeight: 600 }}>{affectedResumeSection}</span>
            </div>
          </div>

          {item.why && (
            <div className="improvement-section">
              <div className="improvement-section-title">👔 Recruiter Impact Rationale</div>
              <div className="improvement-section-text">{item.why}</div>
            </div>
          )}

          {item.how && (
            <div className="improvement-section">
              <div className="improvement-section-title">🛠 Actionable Implementation Steps</div>
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
