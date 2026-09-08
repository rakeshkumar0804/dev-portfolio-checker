import { createContext, useContext, useEffect, useState } from "react";
import { getAccount, loginAccount, registerAccount, saveReportToWorkspace } from "../services/apiService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("saas_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    getAccount()
      .then((data) => {
        setUser(data.user || null);
      })
      .catch((err) => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem("saas_token");
          localStorage.removeItem("saas_user");
          setUser(null);
        }
      })
      .finally(() => setLoading(false));

    function handleSessionExpired() {
      setUser(null);
    }
    window.addEventListener("saas_session_expired", handleSessionExpired);
    return () => window.removeEventListener("saas_session_expired", handleSessionExpired);
  }, []);

  async function login(credentials) {
    const data = await loginAccount(credentials);
    if (data.token) {
      localStorage.setItem("saas_token", data.token);
      if (data.user) {
        localStorage.setItem("saas_user", JSON.stringify(data.user));
        setUser(data.user);
      }
    }
    return data;
  }

  async function register(credentials) {
    const data = await registerAccount(credentials);
    if (data.token) {
      localStorage.setItem("saas_token", data.token);
      if (data.user) {
        localStorage.setItem("saas_user", JSON.stringify(data.user));
        setUser(data.user);
      }
    }
    return data;
  }

  function logout() {
    localStorage.removeItem("saas_token");
    localStorage.removeItem("saas_user");
    setUser(null);
  }

  async function claimReport(shareId, reportObj = null) {
    const result = await saveReportToWorkspace(shareId, reportObj);
    return result;
  }

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user && localStorage.getItem("saas_token")),
    login,
    register,
    logout,
    claimReport,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
