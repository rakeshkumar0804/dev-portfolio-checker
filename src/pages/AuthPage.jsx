import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthPage() {
  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register, claimReport } = useAuth();

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        await register(form);
      } else {
        await login(form);
      }

      // Claim temporary guest report if one exists
      try {
        const cachedReport = sessionStorage.getItem("portfolioReport");
        if (cachedReport) {
          const parsed = JSON.parse(cachedReport);
          if (parsed && parsed.shareId) {
            await claimReport(parsed.shareId, parsed);
          }
        }
      } catch (_) {}

      navigate("/dashboard");
    } catch (err) {
      if (err.response?.status === 404) {
        setError("API service unavailable. Please check your backend connection.");
      } else if (!err.response) {
        setError("Cannot connect to server. Please check your network and try again.");
      } else {
        const backendMsg = err.response?.data?.message;
        if (backendMsg) {
          setError(backendMsg);
        } else if (mode === "login") {
          setError("Invalid email or password.");
        } else {
          setError("Registration failed. Please check your details and try again.");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-back" to="/">← Back to PortfolioPulse</Link>
        <span className="signal-eyebrow">Your career command center</span>
        <h1>{mode === "register" ? "Start your free workspace" : "Welcome back"}</h1>
        <p>{mode === "register" ? "Continuous evidence-based developer scoring. No card required." : "Sign in to access your saved workspace reports."}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <label>
              Name
              <input required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
            </label>
          )}
          <label>
            Work email
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input required type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
          </label>
          {error && <div className="error-banner">{error}</div>}
          <button className="btn-primary" disabled={loading} type="submit">
            {loading ? "Please wait…" : mode === "register" ? "Create free workspace →" : "Sign in →"}
          </button>
        </form>
        <button className="auth-switch" type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}>
          {mode === "register" ? "Already have an account? Sign in" : "New here? Create a free workspace"}
        </button>
      </section>
    </main>
  );
}
