import React, { useState } from "react";

export default function RecruiterSimulationFlow({ githubData, portfolioData, resumeAnalysis, recruiterDecision }) {
  const [activeStep, setActiveStep] = useState(0);

  const hasGithub = !!(githubData && githubData.profile);
  const hasPortfolio = !!(portfolioData && portfolioData.accessible);
  const hasResume = !!(resumeAnalysis && resumeAnalysis.atsScore > 0);

  const steps = [
    {
      id: "github",
      icon: "🐙",
      title: "GitHub Profile Review",
      status: hasGithub ? "✓ GitHub Reviewed" : "⚠ GitHub Skipped",
      pass: hasGithub,
      detail: hasGithub
        ? `${githubData.stats?.commitCount90Days || 0} commits in 90d · ${githubData.stats?.totalStars || 0} stars · ${githubData.stats?.ownedRepos || 0} repos`
        : "No public GitHub profile provided for code verification.",
    },
    {
      id: "portfolio",
      icon: "🌐",
      title: "Portfolio Website Review",
      status: hasPortfolio ? "✓ Portfolio Reviewed" : "⚠ Portfolio Skipped",
      pass: hasPortfolio,
      detail: hasPortfolio
        ? `Live site active at ${portfolioData.url} · SEO & accessibility audit complete`
        : "No live portfolio link provided for UI/UX audit.",
    },
    {
      id: "resume",
      icon: "📄",
      title: "Resume ATS Keyword Scan",
      status: hasResume ? (resumeAnalysis.atsScore >= 70 ? "✓ Resume Verified" : "⚠ Resume Needs Impact") : "⚠ Resume Skipped",
      pass: hasResume && resumeAnalysis.atsScore >= 60,
      detail: hasResume
        ? `ATS score ${resumeAnalysis.atsScore}/100 · ${resumeAnalysis.hasMetrics ? "Contains quantitative metrics" : "Lacks quantitative impact metrics"}`
        : "No PDF resume uploaded for keyword alignment scan.",
    },
    {
      id: "verdict",
      icon: "🎯",
      title: "Recruiter Shortlist Decision",
      status: recruiterDecision?.decision === "YES" ? "✓ Interview Call Recommended" : "🟡 Talent Pool Shortlist",
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
            <span>👀</span> Section 2: Interactive Recruiter Review Simulation
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: "1.2rem" }}>{s.icon}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: s.pass ? "var(--green)" : "var(--yellow)" }}>
                {s.status}
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
