import React, { useState } from "react";

export default function ScoreSimulator({ initialScore, improvements, recruiterDecision }) {
  const [checkedItems, setCheckedItems] = useState({});

  if (!improvements || improvements.length === 0) return null;

  const toggleItem = (idx) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Calculate simulated score gain
  const addedPoints = Object.entries(checkedItems).reduce((sum, [idx, isChecked]) => {
    if (isChecked) {
      return sum + (improvements[parseInt(idx, 10)]?.points || 0);
    }
    return sum;
  }, 0);

  const simulatedScore = Math.min(100, (initialScore || 50) + addedPoints);

  let simulatedVerdict = "⚡ Promising Candidate";
  let simulatedColor = "var(--yellow)";
  if (simulatedScore >= 80) {
    simulatedVerdict = "🌟 Shortlist: YES — High Priority Candidate";
    simulatedColor = "var(--green)";
  } else if (simulatedScore >= 65) {
    simulatedVerdict = "⚡ Shortlist: MAYBE — Strong Foundations";
    simulatedColor = "var(--cyan)";
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)",
        borderRadius: 16,
        padding: "24px",
        border: "1px solid var(--border-hover)",
        marginBottom: 32,
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <span>🎛️</span> Interactive "What If?" Score Simulator
          </h3>
          <p style={{ color: "var(--txt-3)", fontSize: "0.82rem", marginTop: 4, margin: 0 }}>
            Toggle action items below to simulate your projected score gain and recruiter decision in real time.
          </p>
        </div>

        {/* Simulated Score Gauge */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(15,23,42,0.8)", padding: "10px 20px", borderRadius: 14, border: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--txt-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Simulated Score</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: addedPoints > 0 ? "var(--cyan)" : "var(--txt-1)", lineHeight: 1 }}>
              {simulatedScore} <span style={{ fontSize: "0.8rem", color: "var(--green)" }}>{addedPoints > 0 ? `(+${addedPoints})` : ""}</span>
            </div>
          </div>

          <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 16 }}>
            <div style={{ fontSize: "0.7rem", color: "var(--txt-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Projected Verdict</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: simulatedColor }}>
              {simulatedVerdict}
            </div>
          </div>
        </div>
      </div>

      {/* Simulator Checklist */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        {improvements.slice(0, 6).map((item, idx) => {
          const isChecked = !!checkedItems[idx];
          return (
            <div
              key={idx}
              onClick={() => toggleItem(idx)}
              style={{
                background: isChecked ? "rgba(56, 189, 248, 0.1)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isChecked ? "rgba(56, 189, 248, 0.4)" : "var(--border)"}`,
                borderRadius: 10,
                padding: "12px 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                transition: "all 0.2s ease",
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {}}
                style={{ marginTop: 3, cursor: "pointer" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.83rem", fontWeight: 600, color: isChecked ? "var(--cyan)" : "var(--txt-1)", lineHeight: 1.3 }}>
                  {item.action}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--green)", fontWeight: 700, marginTop: 4 }}>
                  +{item.points} Score Points &nbsp;·&nbsp; {item.difficulty} Effort
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
