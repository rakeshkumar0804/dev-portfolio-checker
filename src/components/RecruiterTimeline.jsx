import React from "react";
import Icon from "./Icon.jsx";

export default function RecruiterTimeline({ githubData, portfolioData, resumeAnalysis, recruiterDecision, data }) {
  const hasGithub = Boolean(githubData && (githubData.profile || githubData.stats || githubData.topRepos?.length > 0));
  const hasPortfolio = Boolean(portfolioData && portfolioData.accessible);
  const isPortfolioFailed = Boolean(portfolioData && !portfolioData.accessible) || Boolean(!hasPortfolio && (data?.portfolioUrl || data?.analysisMode?.includes("portfolio")));
  const hasResume = Boolean(
    resumeAnalysis &&
    (
      (typeof resumeAnalysis.wordCount === "number" && resumeAnalysis.wordCount > 0) ||
      (typeof resumeAnalysis.atsScore === "number" && resumeAnalysis.atsScore > 0 && (
        (Array.isArray(resumeAnalysis.skillsExtracted) && resumeAnalysis.skillsExtracted.length > 0) ||
        (Array.isArray(resumeAnalysis.matchedKeywords) && resumeAnalysis.matchedKeywords.length > 0)
      ))
    )
  );

  const checklistItems = [
    {
      step: "Signal 1",
      icon: "github",
      title: "GitHub Code & Activity Audit",
      description: hasGithub ? `Audited ${githubData.stats?.ownedRepos || 0} project repos & 90-day commit activity` : "GitHub profile not submitted",
      status: hasGithub ? "Verified" : "Not analyzed",
      pass: hasGithub,
    },
    {
      step: "Signal 2",
      icon: "globe",
      title: "Portfolio Health Check",
      description: hasPortfolio
        ? "Portfolio response and structure checks"
        : isPortfolioFailed
        ? "Portfolio URL could not be reached"
        : "Portfolio link not submitted",
      status: hasPortfolio ? "Verified" : isPortfolioFailed ? "Unavailable" : "Not analyzed",
      pass: hasPortfolio,
    },
    {
      step: "Signal 3",
      icon: "file-text",
      title: "Resume ATS Keyword Audit",
      description: hasResume ? `ATS Keyword Alignment (${resumeAnalysis.atsScore}/100)` : "PDF résumé not uploaded",
      status: hasResume ? "Verified" : "Not analyzed",
      pass: hasResume && resumeAnalysis.atsScore >= 60,
    },
    {
      step: "Signal 4",
      icon: "sliders",
      title: "Skill Proof Consistency",
      description: (hasGithub && hasResume)
        ? "Cross-examined resume claims against public GitHub repo proof"
        : "Requires both GitHub and résumé to cross-reference skills",
      status: (hasGithub && hasResume) ? "Evaluated" : "Not analyzed",
      pass: hasGithub && hasResume,
    },
    {
      step: "Verdict",
      icon: "check-circle",
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
            <Icon name="file-text" size={18} /> Section 3: 10-Second Recruiter Audit Checklist
          </h3>
          <p style={{ color: "var(--txt-3)", fontSize: "0.82rem", marginTop: 4, margin: 0 }}>
            Illustrative breakdown of the core technical signals evaluated during candidate screening.
          </p>
        </div>

        <div style={{ fontSize: "0.74rem", padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--txt-3)", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon name="info" size={12} /> Illustrative simulation — not an actual recruiter review
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

            <div style={{ fontSize: "1.1rem", marginBottom: 6, color: "var(--cyan)" }}>
              <Icon name={item.icon} size={20} />
            </div>
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
