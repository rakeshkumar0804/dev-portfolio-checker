export default function SkillsDetector({ missingSkills = {}, detectedSkills = [], targetRole }) {
  const categories = Object.entries(missingSkills);

  if (!categories.length) {
    return (
      <div style={{ color: "var(--txt-3)", fontSize: "0.88rem" }}>
        No skill data available. Add topic tags to your repositories to enable skill detection.
      </div>
    );
  }

  const totalSkills = categories.reduce((s, [, v]) => s + v.skills.length, 0);
  const presentSkills = categories.reduce((s, [, v]) => s + v.present.length, 0);
  const matchPct = totalSkills > 0 ? Math.round((presentSkills / totalSkills) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: "var(--r-md)", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: "var(--txt-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Role Match — {targetRole ? targetRole.charAt(0).toUpperCase() + targetRole.slice(1) : "Developer"}
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.6rem", fontWeight: 800, color: matchPct >= 60 ? "var(--green)" : matchPct >= 40 ? "var(--yellow)" : "var(--red)" }}>
            {matchPct}%
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 4, width: `${matchPct}%`, background: matchPct >= 60 ? "var(--green)" : matchPct >= 40 ? "var(--yellow)" : "var(--red)", transition: "width 0.8s ease" }} />
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--txt-3)", marginTop: 4 }}>
            {presentSkills}/{totalSkills} expected skills detected in your repositories
          </div>
        </div>
      </div>

      <div className="skills-grid">
        {categories.map(([category, { present, missing }]) => (
          <div key={category} className="skill-category-card">
            <div className="skill-cat-title">{category}</div>
            <div className="skill-tags">
              {present.map((s) => (
                <span key={s} className="skill-tag skill-have">✓ {s}</span>
              ))}
              {missing.map((s) => (
                <span key={s} className="skill-tag skill-miss">✗ {s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: "0.78rem", color: "var(--txt-3)", display: "flex", gap: 16 }}>
        <span><span className="skill-tag skill-have" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>✓ Have</span> — detected in GitHub repos/topics</span>
        <span><span className="skill-tag skill-miss" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>✗ Missing</span> — add as repo topics to improve score</span>
      </div>
    </div>
  );
}
