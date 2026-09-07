import React, { useState } from "react";
import Icon from "./Icon.jsx";

export default function RecruiterSimulationFlow({ githubData, portfolioData, resumeAnalysis, recruiterDecision, data }) {
  const [activeStep, setActiveStep] = useState(0);

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

  const steps = [
    {
      id: "github",
      icon: "github",
      title: "GitHub Profile Review",
      status: hasGithub ? "GitHub Reviewed" : "GitHub Not Analyzed",
      statusIcon: hasGithub ? "check" : "info",
      pass: hasGithub,
      detail: hasGithub
        ? `${githubData.stats?.commitCount90Days || 0} commits in 90d · ${githubData.stats?.totalStars || 0} stars · ${githubData.stats?.ownedRepos || 0} repos`
        : "No public GitHub profile submitted for code verification.",
    },
    {
      id: "portfolio",
      icon: "globe",
      title: "Portfolio Website Review",
      status: hasPortfolio
        ? "Portfolio Reviewed"
        : isPortfolioFailed
        ? "Portfolio Unavailable"
        : "Portfolio Not Analyzed",
      statusIcon: hasPortfolio ? "check" : isPortfolioFailed ? "alert-triangle" : "info",
      pass: hasPortfolio,
      detail: hasPortfolio
        ? `Live site active at ${portfolioData.url} · SEO & accessibility audit complete`
        : isPortfolioFailed
        ? "Portfolio URL could not be reached during analysis."
        : "No live portfolio link submitted for UI/UX audit.",
    },
    {
      id: "resume",
      icon: "file-text",
      title: "Resume ATS Keyword Scan",
      status: hasResume
        ? (resumeAnalysis.atsScore >= 70 ? "Resume Verified" : "Resume Needs Impact")
        : "Resume Not Analyzed",
      statusIcon: hasResume ? (resumeAnalysis.atsScore >= 70 ? "check" : "alert-triangle") : "info",
      pass: hasResume && resumeAnalysis.atsScore >= 60,
      detail: hasResume
        ? `ATS score ${resumeAnalysis.atsScore}/100 · ${resumeAnalysis.hasMetrics ? "Contains quantitative metrics" : "Lacks quantitative impact metrics"}`
        : "No PDF resume uploaded for keyword alignment scan.",
    },
    {
      id: "verdict",
      icon: "target",
      title: "Recruiter Shortlist Decision",
      status: recruiterDecision?.decision === "YES" ? "Interview Call Recommended" : "Talent Pool Shortlist",
      statusIcon: recruiterDecision?.decision === "YES" ? "check-circle" : "clock",
      pass: recruiterDecision?.decision === "YES",
      detail: recruiterDecision?.decisionLabel || "Evaluation complete.",
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <Icon name="eye" size={18} style={{ color: "var(--cyan)" }} />
            <span>Section 2: Interactive Recruiter Review Simulation</span>
          </h3>
          <p style={{ color: "var(--txt-3)", fontSize: "0.82rem", marginTop: 4, margin: 0 }}>
            Simulating how a tech recruiter inspects your profile channels in sequence before shortlisting.
          </p>
        </div>
      </div>

      {/* Steps Timeline */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {steps.map((s, idx) => (
          <div
            key={s.id}
            onClick={() => setActiveStep(idx)}
            style={{
              background: activeStep === idx ? "rgba(56, 189, 248, 0.08)" : "rgba(255,255,255,0.02)",
              borderRadius: 12,
              padding: "16px",
              border: `1px solid ${activeStep === idx ? "var(--cyan)" : s.pass ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)"}`,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icon name={s.icon} size={18} style={{ color: "var(--cyan)" }} />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: s.pass ? "var(--green)" : "var(--yellow)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name={s.statusIcon} size={12} />
                <span>{s.status}</span>
              </span>
            </div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--txt-1)", marginBottom: 4 }}>
              {s.title}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--txt-3)", lineHeight: 1.4 }}>
              {s.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
