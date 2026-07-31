function getHeatColor(count) {
  if (!count || count === 0) return "rgba(255,255,255,0.04)";
  if (count <= 2) return "rgba(56,189,248,0.2)";
  if (count <= 5) return "rgba(56,189,248,0.45)";
  if (count <= 10) return "rgba(56,189,248,0.7)";
  return "var(--cyan)";
}

export default function ActivityHeatmap({ weeklyActivity = [] }) {
  if (!weeklyActivity.length) {
    return <p style={{ color: "var(--txt-3)", fontSize: "0.85rem" }}>No activity data available</p>;
  }

  const maxCount = Math.max(...weeklyActivity.map((w) => w.count), 1);

  return (
    <div>
      <div className="heatmap-wrap">
        <div className="heatmap-grid">
          {weeklyActivity.map((week, i) => {
            const date = new Date(week.week);
            const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              <div key={i} className="heatmap-col" title={`${label}: ${week.count} events`}>
                <div
                  className="heatmap-cell"
                  style={{ background: getHeatColor(week.count) }}
                />
                <span className="heatmap-week-label">
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: "0.72rem", color: "var(--txt-3)" }}>
        <span>Less</span>
        {[0, 2, 5, 10, 15].map((v) => (
          <div
            key={v}
            style={{ width: 14, height: 14, borderRadius: 3, background: getHeatColor(v) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
