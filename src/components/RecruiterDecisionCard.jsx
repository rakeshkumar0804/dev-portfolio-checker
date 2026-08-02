import React from "react";

export default function RecruiterDecisionCard({ decisionData, targetRole }) {
  if (!decisionData) return null;

  const {
    decision,
    decisionLabel,
    interviewProbability,
    confidenceScore,
    seniorityLevel,
    recruiterThought,
    greenFlags = [],
    redFlags = [],
  } = decisionData;

  const isYes = decision === "YES";
  const isMaybe = decision === "MAYBE";

  const badgeColor = isYes ? "var(--green)" : isMaybe ? "var(--yellow)" : "var(--red)";
  const badgeBg = isYes ? "rgba(34,197,94,0.12)" : isMaybe ? "rgba(234,179,8,0.12)" : "rgba(239,68,68,0.12)";
  const badgeBorder = isYes ? "rgba(34,197,94,0.3)" : isMaybe ? "rgba(234,179,8,0.3)" : "rgba(239,68,68,0.3)";

  const renderFlagText = (flag) => {
    if (!flag) return "";
    if (typeof flag === "string") return flag;
    if (typeof flag === "object") {
      return flag.title ? `${flag.title}${flag.evidence ? ` (${flag.evidence})` : flag.risk ? ` (${flag.risk})` : ""}` : JSON.stringify(flag);
    }
    return String(flag);
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)",
        borderRadius: 16,
        padding: "24px",
        border: `1px solid ${badgeBorder}`,
        marginBottom: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        {/* Left: Decision Badge & Thought */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: "1.4rem" }}>👔</span>
            <span style={{ fontSize: "0.82rem", color: "var(--txt-3)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
              Recruiter Decision Engine
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
              fontSize: "1.05rem",
              marginBottom: 16,
            }}
          >
            <span>{isYes ? "🟢" : isMaybe ? "🟡" : "🔴"}</span>
            <span>{decisionLabel}</span>
          </div>

          <p style={{ color: "var(--txt-1)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 16, maxWidth: 650 }}>
            "{recruiterThought}"
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.82rem", color: "var(--txt-2)" }}>
            <div>
              💼 Target Role: <strong style={{ color: "var(--txt-1)" }}>{(targetRole || "Full Stack").toUpperCase()}</strong>
            </div>
            <div>
              📊 Seniority & Market Benchmark: <strong style={{ color: "var(--cyan)" }}>{seniorityLevel}</strong>
            </div>
          </div>
        </div>

        {/* Right: Interview Call Probability Dial */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            borderRadius: 14,
            padding: "16px 24px",
            textAlign: "center",
            border: "1px solid var(--border)",
            minWidth: 160,
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "var(--txt-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
            Interview Call Likelihood
          </div>
          <div style={{ fontSize: "2.4rem", fontWeight: 800, color: badgeColor, lineHeight: 1 }}>
            {interviewProbability}%
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--txt-3)", marginTop: 6 }}>
            Confidence: {confidenceScore}%
          </div>
        </div>
      </div>

      {/* Flags Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Green Flags */}
        <div style={{ background: "rgba(34, 197, 94, 0.05)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(34, 197, 94, 0.15)" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--green)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span>💪</span> Green Flags (Recruiters Love This)
          </div>
          {greenFlags.map((flag, idx) => (
            <div key={idx} style={{ fontSize: "0.8rem", color: "var(--txt-2)", marginBottom: 4, display: "flex", alignItems: "flex-start", gap: 6 }}>
              <span>✓</span> <span>{renderFlagText(flag)}</span>
            </div>
          ))}
        </div>

        {/* Red Flags */}
        <div style={{ background: "rgba(239, 68, 68, 0.05)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--red)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span>⚠️</span> Critical Hiring Risks (Fix These)
          </div>
          {redFlags.map((flag, idx) => (
            <div key={idx} style={{ fontSize: "0.8rem", color: "var(--txt-2)", marginBottom: 4, display: "flex", alignItems: "flex-start", gap: 6 }}>
              <span>✗</span> <span>{renderFlagText(flag)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
