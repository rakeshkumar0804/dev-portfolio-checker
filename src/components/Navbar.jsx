import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const signedIn = Boolean(localStorage.getItem("saas_token"));
  const storedUserRaw = localStorage.getItem("saas_user");
  let userObj = null;
  try {
    userObj = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  } catch (_) {}

  const displayName = userObj?.name || userObj?.email?.split("@")[0] || "Developer";
  const userInitial = displayName.charAt(0).toUpperCase();

  const minimal = ["/auth"].includes(location.pathname);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function logout() {
    localStorage.removeItem("saas_token");
    localStorage.removeItem("saas_user");
    setDropdownOpen(false);
    navigate("/");
  }

  if (minimal) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo">P</div>
          <span>PortfolioPulse</span>
          <span className="navbar-badge">Career intelligence</span>
        </Link>
        <div className="nav-actions">
          {signedIn ? (
            <div className="nav-user-dropdown-wrap" ref={dropdownRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="nav-user-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border)",
                  borderRadius: "20px",
                  padding: "4px 12px 4px 6px",
                  cursor: "pointer",
                  color: "var(--txt-1)",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--cyan), #6366f1)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {userInitial}
                </div>
                <span>{displayName.split(" ")[0]}</span>
                <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>▼</span>
              </button>

              {dropdownOpen && (
                <div
                  className="nav-dropdown-menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "220px",
                    background: "var(--surface-dark, #0d1117)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                    padding: "8px 0",
                    zIndex: 1000,
                    animation: "fadeIn 0.15s ease",
                  }}
                >
                  <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--txt-1)" }}>{displayName}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--txt-3)", truncate: "true" }}>{userObj?.email || "Account Active"}</div>
                  </div>

                  <Link
                    to="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      color: "var(--txt-1)",
                      fontSize: "0.85rem",
                      textDecoration: "none",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <span>📊</span> Workspace Dashboard
                  </Link>

                  <Link
                    to="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      color: "var(--txt-1)",
                      fontSize: "0.85rem",
                      textDecoration: "none",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <span>📁</span> Saved Reports
                  </Link>

                  <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />

                  <button
                    type="button"
                    onClick={logout}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      background: "none",
                      border: "none",
                      color: "var(--red, #f43f5e)",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>🚪</span> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth" className="nav-link" style={{ color: "var(--txt-2)", fontWeight: 500 }}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
