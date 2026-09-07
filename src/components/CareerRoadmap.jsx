import React from "react";
import Icon from "./Icon.jsx";

export default function CareerRoadmap({ roadmap, targetRole = "fullstack" }) {
  const hasRoadmap = Boolean(
    roadmap &&
    (
      (Array.isArray(roadmap.milestones) && roadmap.milestones.length > 0) ||
      (Array.isArray(roadmap) && roadmap.length > 0) ||
      roadmap.currentLevel ||
      roadmap.targetLevel
    )
  );

  // Professional fallback state when roadmap generation is unavailable
  if (!hasRoadmap) {
    return (
      <div
        className="card"
        style={{
          padding: "48px 32px",
          textAlign: "center",
          maxWidth: 680,
          margin: "24px auto",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Icon name="map" size={44} style={{ color: "var(--cyan)" }} />
        </div>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 10, color: "var(--txt-1)" }}>
          Career Roadmap Unavailable
        </h3>
        <p style={{ color: "var(--txt-2)", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: 16 }}>
          Career roadmap could not be generated for this analysis. Your numerical scores remain unaffected.
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--txt-3)" }}>
          <Icon name="info" size={14} />
          <span>Milestone recommendations require role-specific evaluation context.</span>
        </div>
      </div>
    );
  }

  // Safely normalize levels and timeline
  const currentLevel = typeof roadmap.currentLevel === "string" && roadmap.currentLevel.trim()
    ? roadmap.currentLevel
    : "Evaluated Candidate";
  const targetLevel = typeof roadmap.targetLevel === "string" && roadmap.targetLevel.trim()
    ? roadmap.targetLevel
    : `${(targetRole || "Developer").toUpperCase()} Target`;
  const estimatedWeeks = typeof roadmap.estimatedWeeks === "number" || (typeof roadmap.estimatedWeeks === "string" && roadmap.estimatedWeeks.trim())
    ? roadmap.estimatedWeeks
    : null;

  // Safely normalize milestones (handling strings, arrays, or structured objects)
  const rawMilestones = Array.isArray(roadmap.milestones)
    ? roadmap.milestones
    : Array.isArray(roadmap)
    ? roadmap
    : [];

  const milestones = rawMilestones
    .map((m, i) => {
      if (!m) return null;
      if (typeof m === "string") {
        return {
          week: `Milestone ${i + 1}`,
          task: m,
          impact: "",
        };
      }
      if (typeof m === "object") {
        const taskVal = typeof m.task === "string"
          ? m.task
          : typeof m.action === "string"
          ? m.action
          : typeof m.title === "string"
          ? m.title
          : typeof m.description === "string"
          ? m.description
          : "";

        const impactVal = typeof m.impact === "string"
          ? m.impact
          : typeof m.benefit === "string"
          ? m.benefit
          : "";

        const weekVal = typeof m.week === "string"
          ? m.week
          : typeof m.phase === "string"
          ? m.phase
          : typeof m.timeline === "string"
          ? m.timeline
          : `Phase ${i + 1}`;

        let sanitizedImpact = impactVal;
        if (/callback\s*rate|recruiter\s*callback|interview\s*rate|guaranteed/i.test(sanitizedImpact)) {
          sanitizedImpact = sanitizedImpact
            .replace(/recruiter\s*callback\s*rate/gi, "profile evidence strength")
            .replace(/callback\s*rate/gi, "interview profile visibility")
            .replace(/interview\s*rate/gi, "profile strength");
        }

        return {
          week: weekVal,
          task: taskVal,
          impact: sanitizedImpact,
        };
      }
      return {
        week: `Phase ${i + 1}`,
        task: String(m),
        impact: "",
      };
    })
    .filter((m) => Boolean(m && m.task));

  return (
    <div>
      <div className="roadmap-header">
        <div className="roadmap-level-box">
          <div className="roadmap-level-label" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="user" size={13} style={{ color: "var(--txt-3)" }} />
            <span>Current Level (Heuristic Assessment)</span>
          </div>
          <div className="roadmap-level-value">{currentLevel}</div>
        </div>

        <div className="roadmap-arrow" aria-hidden="true">→</div>

        <div className="roadmap-level-box" style={{ borderColor: "rgba(56,189,248,0.25)", background: "rgba(56,189,248,0.05)" }}>
          <div className="roadmap-level-label" style={{ color: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="target" size={13} style={{ color: "var(--cyan)" }} />
            <span>Target Level (Selected Role Target)</span>
          </div>
          <div className="roadmap-level-value" style={{ color: "var(--cyan)" }}>{targetLevel}</div>
        </div>

        {estimatedWeeks && (
          <div className="roadmap-level-box" style={{ borderColor: "rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.05)" }}>
            <div className="roadmap-level-label" style={{ color: "var(--purple)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon name="clock" size={13} style={{ color: "var(--purple)" }} />
              <span>Estimated Plan</span>
            </div>
            <div className="roadmap-level-value" style={{ color: "var(--purple)" }}>{estimatedWeeks} weeks (Estimated Task Plan)</div>
          </div>
        )}
      </div>

      <p style={{ fontSize: "0.8rem", color: "var(--txt-3)", textAlign: "center", margin: "14px 0 24px" }}>
        Levels represent heuristic profile assessments versus your selected role target, with an estimated task-completion plan to address identified evidence gaps.
      </p>

      {milestones.length > 0 ? (
        <div className="roadmap-timeline">
          {milestones.map((m, i) => (
            <div key={i} className="roadmap-step">
              <div className="roadmap-step-left">
                <div className="roadmap-step-dot" />
                {i < milestones.length - 1 && <div className="roadmap-step-line" />}
              </div>
              <div className="roadmap-step-content">
                <div className="roadmap-step-week">{m.week}</div>
                <div className="roadmap-step-task">{m.task}</div>
                {m.impact && <div className="roadmap-step-impact">{m.impact}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "32px 20px",
            color: "var(--txt-3)",
            fontSize: "0.88rem",
            background: "rgba(255,255,255,0.02)",
            borderRadius: "12px",
            border: "1px solid var(--border)",
          }}
        >
          No detailed milestones generated for this role level. Follow priority action items from the Overview tab.
        </div>
      )}
    </div>
  );
}
