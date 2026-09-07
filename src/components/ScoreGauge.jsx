import { useState, useEffect, useRef } from "react";
import Icon from "./Icon.jsx";

function getScoreColor(score) {
  if (score >= 75) return "var(--green)";
  if (score >= 55) return "var(--cyan)";
  if (score >= 35) return "var(--yellow)";
  return "var(--red)";
}

function getGrade(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  if (score >= 30) return "D";
  return "F";
}

const R = 52;
const CIRC = 2 * Math.PI * R;

export default function ScoreGauge({
  score = 0,
  label,
  sublabel,
  breakdown = [],
  status = "analyzed", // "analyzed" | "not_analyzed" | "unavailable"
}) {
  const [displayScore, setDisplayScore] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);

  const isNotAnalyzed = status === "not_analyzed";
  const isUnavailable = status === "unavailable";
  const isAnalyzed = !isNotAnalyzed && !isUnavailable;

  useEffect(() => {
    if (!isAnalyzed) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated) {
          setAnimated(true);
          let start = 0;
          const end = score;
          const duration = 1200;
          const step = (end / duration) * 16;
          const timer = setInterval(() => {
            start = Math.min(start + step, end);
            setDisplayScore(Math.round(start));
            if (start >= end) clearInterval(timer);
          }, 16);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [score, animated, isAnalyzed]);

  const color = isNotAnalyzed ? "var(--txt-3)" : isUnavailable ? "var(--yellow)" : getScoreColor(score);
  const offset = CIRC - (score / 100) * CIRC;

  // Calculate lost points and potential score gain
  const lostPoints = breakdown.reduce((acc, item) => acc + (item.max - item.score), 0);
  const potentialGain = Math.min(100 - score, Math.round(lostPoints * 0.8));

  const accessibleLabel = `${label}: ${
    isNotAnalyzed
      ? "Not analyzed"
      : isUnavailable
      ? "Unavailable"
      : `${score} out of 100, Grade ${getGrade(score)}`
  }`;

  return (
    <div
      ref={ref}
      className={`score-gauge-card ${expanded ? "expanded" : ""}`}
      style={{ cursor: "pointer" }}
      onClick={() => setExpanded((e) => !e)}
      role="region"
      aria-label={accessibleLabel}
    >
      <svg
        className="score-gauge-svg"
        width="120"
        height="120"
        viewBox="0 0 120 120"
        aria-hidden="true"
      >
        <circle
          className="score-gauge-ring-bg"
          cx="60" cy="60"
          r={R}
          strokeWidth="8"
        />
        <circle
          className="score-gauge-ring"
          cx="60" cy="60"
          r={R}
          strokeWidth="8"
          stroke={color}
          strokeDasharray={CIRC}
          strokeDashoffset={isNotAnalyzed ? CIRC : isUnavailable ? CIRC * 0.75 : (animated ? offset : CIRC)}
          style={{ transition: "stroke-dashoffset 1.2s ease" }}
        />
        <text
          x="60" y={isAnalyzed ? "56" : "60"}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 800,
            fontSize: isAnalyzed ? "20px" : "18px",
          }}
        >
          {isNotAnalyzed ? "—" : isUnavailable ? "!" : displayScore}
        </text>
        {isAnalyzed && (
          <text
            x="60" y="73"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--txt-3)"
            style={{ fontSize: "9px", fontWeight: 600 }}
          >
            / 100
          </text>
        )}
      </svg>

      <div className="score-gauge-label">{label}</div>
      <div className="score-gauge-value" style={{ color, fontSize: isAnalyzed ? undefined : "0.85rem" }}>
        {isNotAnalyzed ? "Not analyzed" : isUnavailable ? "Unavailable" : getGrade(score)}
      </div>

      <div className="score-gauge-expand">
        {expanded ? "▲ Hide Explainability" : "▼ Explain Score & Evidence"}
      </div>

      {expanded && (
        <div className="score-breakdown-panel" style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: isAnalyzed ? "var(--cyan)" : color, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name={isNotAnalyzed ? "info" : isUnavailable ? "alert-triangle" : "info"} size={13} style={{ color: isAnalyzed ? "var(--cyan)" : color }} />
            <span>
              {isNotAnalyzed
                ? `${label} was not submitted for this analysis.`
                : isUnavailable
                ? `${label} could not be reached during analysis.`
                : `Why this score (${score}/100)?`}
            </span>
          </div>

          {isAnalyzed && potentialGain > 0 && (
            <div style={{ background: "rgba(56, 189, 248, 0.08)", padding: "8px 12px", borderRadius: 8, fontSize: "0.78rem", color: "var(--txt-2)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="trending-up" size={13} style={{ color: "var(--cyan)" }} />
              <span>
                Potential Score Gain: <strong style={{ color: "var(--cyan)" }}>+{potentialGain} pts</strong> · Est. Effort: <strong style={{ color: "var(--txt-1)" }}>20–40 mins</strong>
              </span>
            </div>
          )}

          {isAnalyzed ? (
            breakdown.length > 0 ? (
              breakdown.map((item, i) => {
                const pct = item.max > 0 ? (item.score / item.max) * 100 : 0;
                const barColor = pct >= 70 ? "var(--green)" : pct >= 40 ? "var(--cyan)" : "var(--red)";
                return (
                  <div key={i} className="breakdown-row" style={{ marginBottom: 8 }}>
                    <div className="breakdown-label-row">
                      <span className="breakdown-metric">{item.label}</span>
                      <span className="breakdown-score">
                        {item.score}/{item.max}
                      </span>
                    </div>
                    <div className="breakdown-bar-bg">
                      <div
                        className="breakdown-bar-fill"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                    <span className="breakdown-evidence" style={{ fontSize: "0.75rem", color: "var(--txt-3)" }}>
                      {item.evidence}
                    </span>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: "0.78rem", color: "var(--txt-3)" }}>
                Score calculated based on overall readiness metrics for {label}.
              </div>
            )
          ) : isNotAnalyzed ? (
            <div style={{ fontSize: "0.78rem", color: "var(--txt-3)" }}>
              Include this source in a new analysis to evaluate {label.toLowerCase()} benchmarks.
            </div>
          ) : (
            <div style={{ fontSize: "0.78rem", color: "var(--txt-3)" }}>
              Verify network accessibility and public permissions to enable {label.toLowerCase()} evaluation.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
