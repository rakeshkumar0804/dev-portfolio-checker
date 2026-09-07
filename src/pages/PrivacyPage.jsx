import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";

export default function PrivacyPage() {
  return (
    <div className="page-wrap">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 80px" }}>
        
        {/* Header & Return Navigation */}
        <div style={{ marginBottom: 36 }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "var(--cyan)",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              marginBottom: 20,
              padding: "6px 12px",
              borderRadius: "var(--r-sm)",
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              transition: "all 0.15s ease",
            }}
          >
            ← Back to PortfolioPulse
          </Link>

          <div className="hero-badge" style={{ marginBottom: 12 }}>
            <span className="hero-badge-dot" />
            Trust & Transparency Notice
          </div>

          <h1 className="hero-title" style={{ fontSize: "2.2rem", marginBottom: 12 }}>
            Privacy Notice
          </h1>

          <p style={{ color: "var(--txt-2)", fontSize: "1rem", lineHeight: 1.6, maxWidth: 720 }}>
            PortfolioPulse provides transparent technical hiring intelligence. This document describes exactly what data we process, how analysis works, where data is stored, and the current operational boundaries of our system.
          </p>
        </div>

        {/* Structured Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Section 1: Information Processed */}
          <section className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--txt-1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="file-text" size={18} style={{ color: "var(--cyan)" }} />
              <span>1. Information Processed</span>
            </h2>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: 12 }}>
              PortfolioPulse processes four distinct categories of data depending on how you use the platform:
            </p>
            <ul style={{ paddingLeft: 20, margin: 0, color: "var(--txt-2)", fontSize: "0.86rem", lineHeight: 1.7 }}>
              <li><strong>Public Profile Inputs:</strong> Public GitHub usernames and publicly accessible portfolio URLs provided directly in the analysis form.</li>
              <li><strong>Uploaded Files:</strong> Resume documents uploaded in PDF format for ATS formatting and keyword compatibility analysis.</li>
              <li><strong>Account Information:</strong> Name, email address, and salted scrypt password hashes if you register a PortfolioPulse workspace account.</li>
              <li><strong>Generated Analysis Reports:</strong> Numerical scores, keyword match lists, breakdown metrics, and qualitative roadmap guidance created by the scoring engine.</li>
            </ul>
          </section>

          {/* Section 2: How Analysis Works */}
          <section className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--txt-1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="sliders" size={18} style={{ color: "var(--cyan)" }} />
              <span>2. How Analysis Works</span>
            </h2>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              When an audit is initiated, the server independently fetches public data from your specified sources. Numerical scores (overall score, GitHub cadence, portfolio speed, and resume ATS compatibility) are computed entirely through deterministic, rule-based algorithms. Artificial intelligence is optionally used to draft contextual feedback and milestone summaries, but does not alter or generate the underlying numerical scores.
            </p>
          </section>

          {/* Section 3: Public GitHub & Portfolio Data */}
          <section className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--txt-1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="github" size={18} style={{ color: "var(--cyan)" }} />
              <span>3. Public GitHub and Portfolio Data</span>
            </h2>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: 10 }}>
              <strong>No GitHub Credentials:</strong> We only query publicly accessible endpoints on the GitHub REST API (<code style={{ color: "var(--cyan)" }}>api.github.com</code>). We never ask for your GitHub password, personal access token, or OAuth account permissions.
            </p>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              <strong>Public Portfolio Crawling:</strong> Portfolio websites are inspected using headless browser automation to evaluate response latency, page payload weight, meta tags, and image attributes. Network requests are strictly validated against private IP ranges, localhost, and cloud metadata addresses to prevent unauthorized internal network requests (SSRF protection).
            </p>
          </section>

          {/* Section 4: Resume Processing */}
          <section className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--txt-1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="file-text" size={18} style={{ color: "var(--cyan)" }} />
              <span>4. Resume Processing</span>
            </h2>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: 10 }}>
              <strong>Immediate Temporary Deletion:</strong> When you upload a resume PDF, it is temporarily written to an isolated system directory for parsing. The PDF file is deleted from the server disk immediately after text extraction completes or if the file is invalid.
            </p>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              <strong>No Raw Text Persistence:</strong> Full raw resume text is stripped at the processing boundary. Only safe derived metrics (ATS compatibility scores, detected technical skills, action verb usage, and section breakdowns) are saved in analysis reports. Unredacted resume text is never persisted to database storage or returned via public or authenticated APIs.
            </p>
          </section>

          {/* Section 5: AI-Provider Processing */}
          <section className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--txt-1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="zap" size={18} style={{ color: "var(--cyan)" }} />
              <span>5. AI-Provider Processing</span>
            </h2>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              If AI synthesis is enabled on the server, prompt requests are transmitted to the Google Gemini API. These prompts contain public GitHub summary stats, portfolio URL accessibility status, target role requirements, and a limited excerpt of resume text (up to 2,500 characters) to draft qualitative recruiter impressions and improvement roadmaps. These requests are processed by Google Gemini. Google’s handling of submitted data is governed by the terms and privacy documentation applicable to the configured Gemini API service.
            </p>
          </section>

          {/* Section 6: Report & Account Storage */}
          <section className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--txt-1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="bookmark" size={18} style={{ color: "var(--cyan)" }} />
              <span>6. Report and Account Storage</span>
            </h2>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: 10 }}>
              Completed reports are indexed by a server-generated 10-character identifier (<code style={{ color: "var(--cyan)" }}>shareId</code>). Reports are stored in MongoDB when configured, or in server-side JSON storage (<code style={{ color: "var(--cyan)" }}>saved_reports_storage.json</code>).
            </p>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              Account records (name, email, salted password hash) are stored in MongoDB or local user storage (<code style={{ color: "var(--cyan)" }}>saved_users_storage.json</code>) to maintain workspace sessions and saved report libraries.
            </p>
          </section>

          {/* Section 7: Authentication & Password Security */}
          <section className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--txt-1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="lock" size={18} style={{ color: "var(--cyan)" }} />
              <span>7. Authentication and Password Security</span>
            </h2>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: 10 }}>
              <strong>Salted Scrypt Hashing:</strong> PortfolioPulse user account passwords are never stored in plaintext. They are hashed using Node.js native <code style={{ color: "var(--cyan)" }}>crypto.scryptSync</code> with 16 bytes of cryptographically secure random salt and verified via constant-time comparison (<code style={{ color: "var(--cyan)" }}>crypto.timingSafeEqual</code>).
            </p>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              <strong>Session Tokens:</strong> Authenticated sessions use signed HMAC-SHA256 tokens stored in the user's browser local storage with a 7-day expiration window.
            </p>
          </section>

          {/* Section 8: Sharing Behavior */}
          <section className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--txt-1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="share" size={18} style={{ color: "var(--cyan)" }} />
              <span>8. Sharing Behavior</span>
            </h2>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              Report links (<code style={{ color: "var(--cyan)" }}>/results/:shareId</code>) are accessible without authentication. Access is not restricted to an account owner; anyone possessing the exact 10-character share link can view the report. Reports are not private or access-controlled. The publicly visible report includes derived resume metrics, detected skill tags, numerical scores, public repository highlights, and AI-generated feedback, but never contains raw resume text or user account credentials.
            </p>
          </section>

          {/* Section 9: Logs & Operational Data */}
          <section className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--txt-1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="bar-chart" size={18} style={{ color: "var(--cyan)" }} />
              <span>9. Logs and Operational Data</span>
            </h2>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              Server processes output ephemeral operational logs to standard console streams for diagnostics and monitoring. Logs record analysis mode, target roles, HTTP status codes, and service error messages. Authentication tokens, account passwords, and extracted resume contents are never written to operational logs.
            </p>
          </section>

          {/* Section 10: Retention & Deletion */}
          <section className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--txt-1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="clock" size={18} style={{ color: "var(--cyan)" }} />
              <span>10. Retention and Deletion</span>
            </h2>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: 10 }}>
              <strong>MongoDB Reports (48-Hour TTL):</strong> When MongoDB is active, reports are configured with an automated Time-to-Live (TTL) index that permanently purges documents 48 hours after creation (<code style={{ color: "var(--cyan)" }}>expireAfterSeconds: 172800</code>).
            </p>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: 10 }}>
              <strong>File Storage Fallback:</strong> In file-based fallback environments, reports do not have automatic time-based expiration and remain until manually deleted or the storage is cleared.
            </p>
            <p style={{ color: "var(--txt-2)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              <strong>Report Deletion:</strong> Authenticated users can remove individual saved reports from their workspace dashboard at any time via the delete action.
            </p>
          </section>

          {/* Section 11: Security Limitations */}
          <section className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--txt-1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="alert-triangle" size={18} style={{ color: "var(--yellow)" }} />
              <span>11. Security Limitations</span>
            </h2>
            <ul style={{ paddingLeft: 20, margin: 0, color: "var(--txt-2)", fontSize: "0.86rem", lineHeight: 1.7 }}>
              <li><strong>Public Link Access:</strong> Any party with knowledge of a report's 10-character share ID can view that report’s scoring results.</li>
              <li><strong>No Self-Serve Account Deletion:</strong> The current application version does not provide an automated self-serve button to delete user accounts. This is an operational limitation of the current release.</li>
              <li><strong>No Formal Certifications Claimed:</strong> PortfolioPulse does not claim compliance with formal frameworks such as SOC 2, ISO 27001, HIPAA, GDPR, or CCPA. We describe only our actual technical implementations.</li>
            </ul>
          </section>

          {/* Section 12: User Choices */}
          <section className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--txt-1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="check-circle" size={18} style={{ color: "var(--cyan)" }} />
              <span>12. User Choices</span>
            </h2>
            <ul style={{ paddingLeft: 20, margin: 0, color: "var(--txt-2)", fontSize: "0.86rem", lineHeight: 1.7 }}>
              <li><strong>Optional Inputs:</strong> You can choose which inputs to evaluate. GitHub, portfolio URL, and resume upload are independently selectable modes.</li>
              <li><strong>No Mandatory Account:</strong> You can run analyses, review detailed scores, and explore sample reports without ever registering a user account.</li>
              <li><strong>Report Library Management:</strong> Logged-in users can organize or purge saved reports from their personal dashboard library.</li>
            </ul>
          </section>

        </div>

        {/* Footer Return Link */}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <Link
            to="/"
            style={{
              color: "var(--cyan)",
              fontSize: "0.9rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            ← Return to PortfolioPulse Homepage
          </Link>
        </div>

      </div>
    </div>
  );
}
