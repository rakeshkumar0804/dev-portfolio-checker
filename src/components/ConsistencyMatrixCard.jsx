import React, { useState } from "react";
import Icon from "./Icon.jsx";

export default function ConsistencyMatrixCard({ matrix }) {
  const [showFullAudit, setShowFullAudit] = useState(false);

  if (!matrix) return null;

  const {
    consistencyScore,
    verifiedInBoth = [],
    resumeOnly = [],
    githubOnly = [],
    actionAuditList = [],
    warnings = [],
  } = matrix;

  // Do not render a fake consistency matrix if neither source had skills to compare
  if (verifiedInBoth.length === 0 && resumeOnly.length === 0 && githubOnly.length === 0) {
    return null;
  }

  const totalResume = verifiedInBoth.length + resumeOnly.length;
  const isScoreValid = typeof consistencyScore === "number" && Number.isFinite(consistencyScore) && consistencyScore >= 0 && consistencyScore <= 100;
  const overlapRate = totalResume > 0 ? Math.round((verifiedInBoth.length / totalResume) * 100) : null;

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
            <Icon name="refresh" size={16} style={{ color: "var(--cyan)" }} />
            <span>Section 4: Skill Verification Matrix</span>
          </h3>
          <p style={{ color: "var(--txt-3)", fontSize: "0.82rem", marginTop: 4, margin: 0 }}>
            Cross-referencing technical skills claimed on resume against inspected GitHub evidence.
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--txt-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Consistency Index</div>
          <div
            className="matrix-score"
            style={{
              fontSize: isScoreValid ? "1.6rem" : "1.15rem",
              fontWeight: 800,
              color: isScoreValid ? (consistencyScore >= 75 ? "var(--green)" : "var(--yellow)") : "var(--txt-3)",
            }}
          >
            {isScoreValid ? `${consistencyScore}%` : "Not available"}
          </div>
          {totalResume > 0 ? (
            <div
              className="matrix-formula"
              style={{ fontSize: "0.7rem", color: "var(--txt-3)", marginTop: 2 }}
            >
              Skill Overlap: ({verifiedInBoth.length} verified / {totalResume} resume skills) · {overlapRate}%
            </div>
          ) : (
            <div
              className="matrix-formula"
              style={{ fontSize: "0.7rem", color: "var(--txt-3)", marginTop: 2 }}
            >
              Skill Overlap: Not applicable (0 resume skills detected)
            </div>
          )}
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {warnings.map((w, idx) => (
            <div key={idx} className="info-box" style={{ background: "rgba(234, 179, 8, 0.08)", border: "1px solid rgba(234, 179, 8, 0.2)", color: "var(--yellow)", marginBottom: 8, fontSize: "0.83rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="info" size={14} style={{ color: "var(--yellow)" }} />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Compact Summary for Verified Skills */}
      <div style={{ background: "rgba(34, 197, 94, 0.06)", borderRadius: 12, padding: "14px 18px", border: "1px solid rgba(34, 197, 94, 0.18)", marginBottom: 16 }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--green)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="check-circle" size={16} style={{ color: "var(--green)" }} />
          <span>{verifiedInBoth.length} Skills Verified via Inspected GitHub Evidence</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {verifiedInBoth.length > 0 ? (
            verifiedInBoth.map((s) => (
              <span key={s} className="skill-tag skill-have" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.3)", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="check" size={11} />
                <span>{s}</span>
              </span>
            ))
          ) : (
            <span style={{ fontSize: "0.78rem", color: "var(--txt-3)" }}>No overlapping skills verified yet</span>
          )}
        </div>
      </div>

      {/* Action Needed Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
        {/* Resume Only */}
        <div style={{ background: "rgba(234, 179, 8, 0.04)", borderRadius: 12, padding: "16px", border: "1px solid rgba(234, 179, 8, 0.12)" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--yellow)", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="file-text" size={14} style={{ color: "var(--yellow)" }} />
              <span>Claimed on Resume Only</span>
            </span>
            <span>{resumeOnly.length}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {resumeOnly.length > 0 ? (
              resumeOnly.map((s) => (
                <span key={s} className="skill-tag" style={{ background: "rgba(234, 179, 8, 0.12)", color: "#fde047", border: "1px solid rgba(234, 179, 8, 0.25)" }}>
                  ? {s}
                </span>
              ))
            ) : (
              <span style={{ fontSize: "0.78rem", color: "var(--txt-3)" }}>All resume skills supported by inspected GitHub evidence</span>
            )}
          </div>
        </div>

        {/* GitHub Only */}
        <div style={{ background: "rgba(56, 189, 248, 0.04)", borderRadius: 12, padding: "16px", border: "1px solid rgba(56, 189, 248, 0.12)" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--cyan)", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="github" size={14} style={{ color: "var(--cyan)" }} />
              <span>Detected in GitHub Evidence (Missing from Resume)</span>
            </span>
            <span>{githubOnly.length}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {githubOnly.length > 0 ? (
              githubOnly.map((s) => (
                <span key={s} className="skill-tag" style={{ background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.25)" }}>
                  + {s}
                </span>
              ))
            ) : (
              <span style={{ fontSize: "0.78rem", color: "var(--txt-3)" }}>All GitHub skills listed on resume</span>
            )}
          </div>
        </div>
      </div>

      {actionAuditList.length > 0 && (
        <>
          <button
            onClick={() => setShowFullAudit((s) => !s)}
            style={{
              width: "100%",
              padding: "10px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--cyan)",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            {showFullAudit ? "▲ Hide Action Audit Table" : "▼ View Action Audit Table for Unverified & Missing Skills"}
          </button>

          {showFullAudit && (
            <div style={{ marginTop: 16, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--txt-3)" }}>
                    <th style={{ padding: "8px" }}>Skill</th>
                    <th style={{ padding: "8px" }}>Status</th>
                    <th style={{ padding: "8px" }}>Evidence Rationale</th>
                    <th style={{ padding: "8px" }}>Actionable Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {actionAuditList.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "8px", fontWeight: 700, color: "var(--txt-1)" }}>{item.skill}</td>
                      <td style={{ padding: "8px", color: item.status.includes("Resume") ? "var(--yellow)" : "var(--cyan)" }}>
                        {item.status}
                      </td>
                      <td style={{ padding: "8px", color: "var(--txt-2)" }}>{item.evidenceMissing}</td>
                      <td style={{ padding: "8px", color: "var(--txt-1)" }}>{item.actionableFix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
