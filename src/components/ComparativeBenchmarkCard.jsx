import React from "react";

export default function ComparativeBenchmarkCard({ comparative, targetRole }) {
  if (!comparative) return null;

  const {
    yourScore = 74,
    juniorThreshold = 50,
    midLevelThreshold = 65,
    seniorThreshold = 80,
  } = comparative;

  const items = [
    { label: "Your Profile Score", score: yourScore, color: "var(--cyan)", isYou: true },
    { label: "Junior Level Score Threshold", score: juniorThreshold, color: "var(--txt-3)", isYou: false },
    { label: "Mid-Level Score Threshold", score: midLevelThreshold, color: "var(--yellow)", isYou: false },
    { label: "Senior Level Score Threshold", score: seniorThreshold, color: "var(--green)", isYou: false },
  ];

  return (
    <div
      style={{
        background: "var(--bg-card)",
        borderRadius: 16,
        padding: "24px",
        border: "1px solid var(--border)",
        marginBottom: 32,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <span>📊</span> Section 3: Deterministic Seniority Benchmarks
          </h3>
          <p style={{ color: "var(--txt-3)", fontSize: "0.82rem", marginTop: 4, margin: 0 }}>
            Comparing your calculated score against deterministic readiness thresholds for {(targetRole || "fullstack").toUpperCase()} roles.
          </p>
        </div>
      </div>

      {/* Multi-Level Bar Comparison */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map((item) => (
          <div key={item.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem", marginBottom: 4 }}>
              <span style={{ fontWeight: item.isYou ? 700 : 500, color: item.isYou ? "var(--cyan)" : "var(--txt-2)" }}>
                {item.label} {item.isYou && " (Active Audit)"}
              </span>
              <span style={{ fontWeight: 800, color: item.color }}>{item.score} / 100</span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${item.score}%`,
                  background: item.color,
                  borderRadius: 6,
                  transition: "width 1s ease-in-out",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
