export default function CareerRoadmap({ roadmap }) {
  if (!roadmap) return null;

  const { currentLevel, targetLevel, estimatedWeeks, milestones = [] } = roadmap;

  return (
    <div>
      <div className="roadmap-header">
        <div className="roadmap-level-box">
          <div className="roadmap-level-label">📍 Current Level</div>
          <div className="roadmap-level-value">{currentLevel}</div>
        </div>
        <div className="roadmap-arrow">→</div>
        <div className="roadmap-level-box" style={{ borderColor: "rgba(56,189,248,0.25)", background: "rgba(56,189,248,0.05)" }}>
          <div className="roadmap-level-label" style={{ color: "var(--cyan)" }}>🎯 Target Level</div>
          <div className="roadmap-level-value" style={{ color: "var(--cyan)" }}>{targetLevel}</div>
        </div>
        {estimatedWeeks && (
          <div className="roadmap-level-box" style={{ borderColor: "rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.05)" }}>
            <div className="roadmap-level-label" style={{ color: "var(--purple)" }}>⏱ Est. Timeline</div>
            <div className="roadmap-level-value" style={{ color: "var(--purple)" }}>{estimatedWeeks} weeks</div>
          </div>
        )}
      </div>

      {milestones.length > 0 && (
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
      )}
    </div>
  );
}
