import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo">🔍</div>
          <span>Dev Portfolio Checker</span>
          <span className="navbar-badge">AI Powered</span>
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ padding: "6px 14px", fontSize: "0.8rem" }}
          >
            ⭐ Star on GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
