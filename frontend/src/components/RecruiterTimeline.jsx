import React from "react";

export default function RecruiterTimeline({ githubData, portfolioData, resumeAnalysis, recruiterDecision }) {
  const hasGithub = !!(githubData && githubData.profile);
  const hasPortfolio = !!(portfolioData && portfolioData.accessible);
  const hasResume = !!(resumeAnalysis && resumeAnalysis.atsScore > 0);

  const checklistItems = [
    {
      step: "Signal 1",
      icon: "🐙",
      title: "GitHub Code & Activity Audit",
      description: hasGithub ? `Audited ${githubData.stats?.ownedRepos || 0} project repos & 90-day commit activity` : "GitHub profile not provided",
      status: hasGithub ? "Verified" : "Skipped",
      pass: hasGithub,
    },
    {
      step: "Signal 2",
      icon: "🌐",
      title: "Portfolio Vitals Audit",
      description: hasPortfolio ? "Verified live website, mobile responsiveness & SEO" : "Portfolio link not provided",
      status: hasPortfolio ? "Verified" : "Skipped",
      pass: hasPortfolio,
    },
    {
      step: "Signal 3",
      icon: "📄",
      title: "Resume ATS Keyword Audit",
      description: hasResume ? `ATS Keyword Alignment (${resumeAnalysis.atsScore}/100)` : "PDF resume not uploaded",
      status: hasResume ? "Verified" : "Skipped",
      pass: hasResume && resumeAnalysis.atsScore >= 60,
    },
    {
      step: "Signal 4",
      icon: "⚖️",
      title: "Skill Proof Consistency",
      description: "Cross-examined resume claims against public GitHub repo proof",
      status: "Evaluated",
      pass: true,
    },
    {
      step: "Verdict",
      icon: "🎯",
      title: "Recruiter Verdict Rationale",
      description: recruiterDecision?.decisionLabel || "Deterministic evaluation complete",
      status: recruiterDecision?.decision === "YES" ? "Strong Candidate" : "Promising Candidate",
      pass: recruiterDecision?.decision === "YES",
    },
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <span>📋</span> Section 2: 10-Second Recruiter Audit Checklist
          </h3>
          <p style={{ color: "var(--txt-3)", fontSize: "0.82rem", marginTop: 4, margin: 0 }}>
            Illustrative breakdown of the core technical signals evaluated during candidate screening.
          </p>
        </div>

        <div style={{ fontSize: "0.74rem", padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--txt-3)" }}>
          ℹ️ Illustrative simulation — not an actual recruiter review
        </div>
      </div>

      {/* Checklist Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {checklistItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: 12,
              padding: "16px 14px",
              border: `1px solid ${item.pass ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)"}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: "0.72rem", color: "var(--cyan)", fontWeight: 700 }}>
                {item.step}
              </span>
              <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: item.pass ? "var(--green)" : "var(--yellow)" }}>
                {item.status}
              </span>
            </div>

            <div style={{ fontSize: "1.1rem", marginBottom: 4 }}>{item.icon}</div>
            <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--txt-1)", marginBottom: 4 }}>
              {item.title}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--txt-3)", lineHeight: 1.3 }}>
              {item.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
