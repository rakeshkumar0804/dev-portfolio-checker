import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginAccount, registerAccount } from "../services/apiService.js";

export default function AuthPage() {
  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const result = mode === "register" ? await registerAccount(form) : await loginAccount(form);
      localStorage.setItem("saas_token", result.token);
      localStorage.setItem("saas_user", JSON.stringify(result.user));

      // Auto-save any pending analysis report from guest session
      try {
        const cachedReport = sessionStorage.getItem("portfolioReport");
        if (cachedReport) {
          const parsed = JSON.parse(cachedReport);
          if (parsed && parsed.shareId) {
            const { saveReportToWorkspace } = await import("../services/apiService.js");
            await saveReportToWorkspace(parsed.shareId, parsed);
          }
        }
      } catch (_) {}

      navigate("/dashboard");
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Your API is running an older build. Stop it, then run npm run start from this SaaS project folder.");
      } else if (!err.response) {
        setError("The API is not running. In a second terminal, run npm run start and try again.");
      } else {
        const backendMsg = err.response?.data?.message;
        if (backendMsg) {
          setError(backendMsg);
        } else if (mode === "login") {
          setError("Invalid email or password. If you haven't created an account yet, click 'Create a free workspace' below.");
        } else {
          setError("Registration failed. Please check your details and try again.");
        }
      }
    }
    finally { setLoading(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <Link className="auth-back" to="/">← Back to PortfolioPulse</Link>
    <span className="signal-eyebrow">Your career command center</span>
    <h1>{mode === "register" ? "Start your free workspace" : "Welcome back"}</h1>
    <p>{mode === "register" ? "Three deep-dive analyses each month. No card required." : "Sign in to access your private reports and usage."}</p>
    <form onSubmit={submit} className="auth-form">
      {mode === "register" && <label>Name<input required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>}
      <label>Work email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
      <label>Password<input required type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></label>
      {error && <div className="error-banner">{error}</div>}
      <button className="btn-primary" disabled={loading} type="submit">{loading ? "Please wait…" : mode === "register" ? "Create free workspace →" : "Sign in →"}</button>
    </form>
    <button className="auth-switch" type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}>
      {mode === "register" ? "Already have an account? Sign in" : "New here? Create a free workspace"}
    </button>
  </section></main>;
}
