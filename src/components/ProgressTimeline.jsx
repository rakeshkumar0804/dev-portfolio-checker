import React, { useState, useEffect } from "react";

export default function ProgressTimeline({ currentScore, currentUsername }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!currentUsername) return;

    const storageKey = `dev_health_history_${currentUsername.toLowerCase()}`;
    const raw = localStorage.getItem(storageKey);
    let pastList = [];
    if (raw) {
      try { pastList = JSON.parse(raw); } catch (_) { pastList = []; }
    }

    const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const latestPast = pastList[pastList.length - 1];

    // Add current run if not already recorded today
    if (!latestPast || latestPast.date !== todayStr || latestPast.score !== currentScore) {
      const newEntry = { date: todayStr, score: currentScore, timestamp: Date.now() };
      const updated = [...pastList, newEntry].slice(-6); // Keep last 6 runs
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setHistory(updated);
    } else {
      setHistory(pastList);
    }
  }, [currentScore, currentUsername]);

  if (history.length <= 1) return null; // Only show when user has previous audit history

  const firstRun = history[0];
  const delta = currentScore - firstRun.score;
  const isGain = delta >= 0;

  return (
    <div
      style={{
        background: "var(--bg-card)",
        borderRadius: 16,
        padding: "20px 24px",
        border: "1px solid var(--border)",
        marginBottom: 32,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <span>📈</span> Audit Progression & Score History Timeline
          </h3>
          <p style={{ color: "var(--txt-3)", fontSize: "0.8rem", marginTop: 4, margin: 0 }}>
            Tracking score evolution over time for @{currentUsername}.
          </p>
        </div>

        <div style={{ padding: "6px 14px", borderRadius: 20, background: isGain ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.12)", border: `1px solid ${isGain ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`, color: isGain ? "var(--green)" : "var(--yellow)", fontWeight: 700, fontSize: "0.83rem" }}>
          {isGain ? `▲ +${delta} Score Points Gained!` : `▼ ${delta} Points Difference`}
        </div>
      </div>

      {/* History Timeline Dots */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, overflowX: "auto", paddingBottom: 6 }}>
        {history.map((entry, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "center", minWidth: 70 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--txt-3)", marginBottom: 4 }}>{entry.date}</div>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: idx === history.length - 1 ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.04)", border: `2px solid ${idx === history.length - 1 ? "var(--cyan)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.95rem", color: idx === history.length - 1 ? "var(--cyan)" : "var(--txt-2)", margin: "0 auto" }}>
                {entry.score}
              </div>
            </div>

            {idx < history.length - 1 && (
              <div style={{ width: 30, height: 2, background: "rgba(255,255,255,0.1)" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
