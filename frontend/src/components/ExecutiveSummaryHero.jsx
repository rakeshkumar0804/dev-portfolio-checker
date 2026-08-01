import React, { useState } from "react";

export default function ExecutiveSummaryHero({ score, recruiterDecision, targetRole }) {
  const [showQuestions, setShowQuestions] = useState(false);

  if (!recruiterDecision) return null;

  const {
    decision,
    decisionLabel,
    grade = "B",
    toneCategory = "mid",
    confidenceScore = 92,
    confidenceLevel = "High Confidence",
    confidenceRationale = "Verified strictly against public GitHub API commits and repository metadata.",
    hiringRecommendation = "Proceed to Technical Screening Round",
    salaryBandEstimate = "$95,000 – $125,000 USD (Mid-Level Developer Benchmark)",
    recruiterThought = "",
    interviewQuestions = [],
    greenFlags = [],
    redFlags = [],
  } = recruiterDecision;

  const isSenior = toneCategory === "senior";
  const isBeginner = toneCategory === "beginner";

  const badgeColor = isSenior ? "var(--green)" : isBeginner ? "var(--cyan)" : "var(--yellow)";
  const badgeBg = isSenior ? "rgba(34,197,94,0.12)" : isBeginner ? "rgba(56,189,248,0.12)" : "rgba(234,179,8,0.12)";
  const badgeBorder = isSenior ? "rgba(34,197,94,0.3)" : isBeginner ? "rgba(56,189,248,0.3)" : "rgba(234,179,8,0.3)";

  const renderFlagText = (flag) => {
    if (!flag) return "";
    if (typeof flag === "string") return flag;
    if (typeof flag === "object") {
      return flag.title ? `${flag.title}${flag.evidence ? ` (${flag.evidence})` : flag.risk ? ` — ${flag.risk}` : ""}` : JSON.stringify(flag);
    }
    return String(flag);
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)",
        borderRadius: 20,
        padding: "28px 24px",
        border: `1px solid ${badgeBorder}`,
        marginBottom: 28,
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        position: "relative",
      }}
    >
      {/* Top Banner: Single Primary Score + Recruiter Verdict + Confidence */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24, marginBottom: 20 }}>
        {/* Left: Score Ring & Shortlist Decision */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          {/* Single Primary Score Ring */}
          <div style={{ position: "relative", width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
              <circle
                cx="55" cy="55" r="46"
                fill="none"
                stroke="url(#execHeroGrad)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 46}`}
                strokeDashoffset={`${2 * Math.PI * 46 * (1 - score / 100)}`}
                style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1.5s ease" }}
              />
              <defs>
                <linearGradient id="execHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: "absolute", textAlign: "center" }}>
              <div style={{ fontSize: "2.1rem", fontWeight: 900, color: "var(--txt-1)", lineHeight: 1 }}>
                {score}
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--txt-3)", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>
                Hiring Score
              </div>
            </div>
          </div>

          {/* Recruiter Shortlist & Confidence Badges */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  padding: "4px 12px",
                  borderRadius: 8,
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "var(--cyan)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                }}
              >
                Grade {grade}
              </span>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: 20,
                  background: "rgba(34, 197, 94, 0.12)",
                  color: "var(--green)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                }}
              >
                ✓ {confidenceLevel} ({confidenceScore}% Evidence Match)
              </span>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                borderRadius: 30,
                background: badgeBg,
                border: `1px solid ${badgeBorder}`,
                color: badgeColor,
                fontWeight: 700,
                fontSize: "0.98rem",
                marginTop: 4,
              }}
            >
              <span>{isSenior ? "🌟" : isBeginner ? "🌱" : "⚡"}</span>
              <span>{decisionLabel}</span>
            </div>
          </div>
        </div>

        {/* Right: Recommendation & Market Salary Benchmark */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.7)",
            borderRadius: 14,
            padding: "16px 20px",
            border: "1px solid var(--border)",
            minWidth: 240,
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "var(--txt-3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>
            Hiring Action Recommendation
          </div>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--txt-1)", marginBottom: 8, lineHeight: 1.3 }}>
            {hiringRecommendation}
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--cyan)", fontWeight: 600 }}>
            💰 Market Band: {salaryBandEstimate}
          </div>
        </div>
      </div>

      {/* Recruiter Executive Notes */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px 18px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: "0.78rem", color: "var(--txt-3)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <span>👔</span> Executive Recruiter Assessment Note
        </div>
        <p style={{ color: "var(--txt-1)", fontSize: "0.92rem", lineHeight: 1.5, margin: 0 }}>
          "{recruiterThought}"
        </p>
      </div>

      {/* Verified Strengths vs Primary Improvement Areas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
        {/* Strengths */}
        <div style={{ background: "rgba(34, 197, 94, 0.05)", borderRadius: 12, padding: "14px 18px", border: "1px solid rgba(34, 197, 94, 0.18)" }}>
          <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "var(--green)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span>💪</span> Verified Positive Strengths
          </div>
          {greenFlags.map((flag, idx) => (
            <div key={idx} style={{ fontSize: "0.8rem", color: "var(--txt-2)", marginBottom: 4, display: "flex", alignItems: "flex-start", gap: 6 }}>
              <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span>
              <span>{renderFlagText(flag)}</span>
            </div>
          ))}
        </div>

        {/* Improvement Areas */}
        <div style={{ background: "rgba(234, 179, 8, 0.05)", borderRadius: 12, padding: "14px 18px", border: "1px solid rgba(234, 179, 8, 0.18)" }}>
          <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "var(--yellow)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span>🚀</span> Highest Impact Improvement Areas
          </div>
          {redFlags.map((flag, idx) => (
            <div key={idx} style={{ fontSize: "0.8rem", color: "var(--txt-2)", marginBottom: 4, display: "flex", alignItems: "flex-start", gap: 6 }}>
              <span style={{ color: "var(--yellow)", fontWeight: 700 }}>💡</span>
              <span>{renderFlagText(flag)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recruiter Technical Screening Questions Drawer */}
      {interviewQuestions.length > 0 && (
        <div>
          <button
            onClick={() => setShowQuestions((s) => !s)}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              borderRadius: 10,
              color: "var(--cyan)",
              fontWeight: 700,
              fontSize: "0.83rem",
              cursor: "pointer",
              display: "flex",
              justify: "space-between",
              alignItems: "center",
            }}
          >
            <span>❓ View 3 Tailored Recruiter Technical Screening Questions</span>
            <span>{showQuestions ? "▲ Hide Questions" : "▼ Reveal Questions"}</span>
          </button>

          {showQuestions && (
            <div style={{ marginTop: 12, padding: "16px", background: "rgba(15, 23, 42, 0.8)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--txt-3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>
                Tailored Questions for Technical Interview Round:
              </div>
              {interviewQuestions.map((q, idx) => (
                <div key={idx} style={{ fontSize: "0.86rem", color: "var(--txt-1)", marginBottom: 8, paddingLeft: 8, borderLeft: "2px solid var(--cyan)", lineHeight: 1.4 }}>
                  {q}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
