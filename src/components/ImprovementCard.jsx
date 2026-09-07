import { useState } from "react";
import Icon from "./Icon.jsx";

const DIFF_CLASS = {
  Easy:   "badge-easy",
  Medium: "badge-medium",
  Hard:   "badge-hard",
};

const PRI_CLASS = { 1: "pri-1", 2: "pri-2", 3: "pri-3", 4: "pri-4" };

export default function ImprovementCard({ item, imp, index }) {
  const cardItem = item || imp || {};
  const [open, setOpen] = useState(false);

  const howSteps = (cardItem.how || "").split("\n").filter((s) => s.trim());
  const impactLabel = cardItem.points >= 15 ? "High Recruiter Impact" : cardItem.points >= 8 ? "Medium Recruiter Impact" : "Quick Win";
  const confidence = cardItem.confidenceLevel || "High Confidence";
  const affectedRepos = cardItem.affectedRepos || [];
  const affectedResumeSection = cardItem.affectedResumeSection || "Public Profile";

  return (
    <div className="improvement-card anim-fade-up" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="improvement-card-header" onClick={() => setOpen((o) => !o)}>
        <div className={`improvement-priority-badge ${PRI_CLASS[cardItem.priority] || "pri-4"}`}>
          #{index + 1}
        </div>

        <div className="improvement-meta">
          <div className="improvement-title">{cardItem.action}</div>
          <div className="improvement-badges" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <span className="badge badge-points">+{cardItem.points} Score Points</span>
            <span className="badge" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
              {impactLabel}
            </span>
            <span className={`badge ${DIFF_CLASS[cardItem.difficulty] || "badge-medium"}`}>
              {cardItem.difficulty} Effort
            </span>
            {cardItem.timeMinutes > 0 && (
              <span className="badge badge-time" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="clock" size={11} />
                <span>Est. {cardItem.timeMinutes} min</span>
              </span>
            )}
            <span className="badge" style={{ background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.25)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="check" size={11} />
              <span>{confidence}</span>
            </span>
          </div>
        </div>

        <span className={`improvement-expand-icon ${open ? "open" : ""}`}>
          <Icon name={open ? "chevron-up" : "chevron-down"} size={14} />
        </span>
      </div>

      {open && (
        <div className="improvement-detail">
          {/* Affected Target Metadata */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--border)", fontSize: "0.78rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="github" size={13} style={{ color: "var(--cyan)" }} />
              <strong style={{ color: "var(--txt-3)" }}>Affected Repositories:</strong>{" "}
              <span style={{ color: "var(--txt-1)", fontWeight: 600 }}>{affectedRepos.join(", ") || "GitHub Repositories"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="file-text" size={13} style={{ color: "var(--cyan)" }} />
              <strong style={{ color: "var(--txt-3)" }}>Target Section:</strong>{" "}
              <span style={{ color: "var(--txt-1)", fontWeight: 600 }}>{affectedResumeSection}</span>
            </div>
          </div>

          {cardItem.why && (
            <div className="improvement-section">
              <div className="improvement-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="briefcase" size={14} style={{ color: "var(--cyan)" }} />
                <span>Recruiter Impact Rationale</span>
              </div>
              <div className="improvement-section-text">{cardItem.why}</div>
            </div>
          )}

          {cardItem.how && (
            <div className="improvement-section">
              <div className="improvement-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="sliders" size={14} style={{ color: "var(--cyan)" }} />
                <span>Actionable Implementation Steps</span>
              </div>
              {howSteps.length > 1 ? (
                <div className="improvement-how-steps">
                  {howSteps.map((step, i) => (
                    <div key={i} className="improvement-how-step">
                      {step.replace(/^\d+\.\s*/, "")}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="improvement-section-text">{cardItem.how}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
