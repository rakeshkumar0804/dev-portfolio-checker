import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("saas_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function registerAccount(data) {
  const res = await api.post("/auth/register", data);
  return res.data;
}

export async function loginAccount(data) {
  const res = await api.post("/auth/login", data);
  return res.data;
}

export async function getAccount() {
  const res = await api.get("/auth/me");
  return res.data;
}

export async function getRecentReports() {
  const res = await api.get("/auth/reports");
  return res.data;
}

export async function analyzeFullProfile(data) {
  const res = await api.post("/analyze/full", data);
  return res.data;
}

export async function getReport(shareId) {
  const res = await api.get(`/analyze/report/${shareId}`);
  return res.data;
}

export async function uploadResume(formData) {
  const res = await api.post("/resume/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function saveReportToWorkspace(shareId, reportObj = null) {
  console.log("🌐 [SAVE DEBUG Step 2] Sending POST /api/auth/save-report with shareId:", shareId, "Token:", localStorage.getItem("saas_token") ? "PRESENT" : "MISSING");
  let resData = null;
  try {
    const res = await api.post("/auth/save-report", { shareId, report: reportObj });
    resData = res.data;
    console.log("📥 [SAVE DEBUG Step 2b] Backend response received:", resData);
  } catch (e) {
    console.warn("⚠️ [SAVE DEBUG Step 2b Error] API save network warning:", e.message, e.response?.data);
  }

  try {
    if (reportObj && reportObj.shareId === shareId) {
      console.log("💾 [SAVE DEBUG Step 2c] Persisting report object directly to localStorage:", reportObj.shareId);
      saveLocalReport("current", reportObj);
    } else {
      const cachedReport = sessionStorage.getItem("portfolioReport");
      if (cachedReport) {
        const parsed = JSON.parse(cachedReport);
        if (parsed.shareId === shareId) {
          console.log("💾 [SAVE DEBUG Step 2c] Persisting cached report from sessionStorage to localStorage:", parsed.shareId);
          saveLocalReport("current", parsed);
        }
      }
    }
  } catch (_) {}

  return resData || { success: true };
}

export async function deleteReportFromWorkspace(shareId) {
  const res = await api.delete(`/auth/report/${shareId}`);
  removeLocalReport("current", shareId);
  return res.data;
}

export function getLocalSavedReports() {
  try {
    const list1 = localStorage.getItem("portfolio_saved_reports_global");
    const list2 = localStorage.getItem("portfolio_saved_reports_current");
    const r1 = list1 ? JSON.parse(list1) : [];
    const r2 = list2 ? JSON.parse(list2) : [];
    const map = new Map();
    r1.forEach((r) => map.set(r.shareId, r));
    r2.forEach((r) => map.set(r.shareId, r));
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (_) {
    return [];
  }
}

export function saveLocalReport(userId = "current", report) {
  if (!report || !report.shareId) return;
  try {
    const reports = getLocalSavedReports();
    const filtered = reports.filter((r) => r.shareId !== report.shareId);
    filtered.unshift({
      shareId: report.shareId,
      githubUsername: report.githubData?.profile?.username || report.githubUsername,
      portfolioUrl: report.portfolioData?.url || report.portfolioUrl,
      targetRole: report.targetRole || "fullstack",
      analysisMode: report.analysisMode || "full_360",
      scores: report.scores,
      createdAt: report.createdAt || Date.now(),
    });
    localStorage.setItem("portfolio_saved_reports_global", JSON.stringify(filtered));
    localStorage.setItem("portfolio_saved_reports_current", JSON.stringify(filtered));
  } catch (_) {}
}

export function removeLocalReport(userId = "current", shareId) {
  try {
    const reports = getLocalSavedReports();
    const filtered = reports.filter((r) => r.shareId !== shareId);
    localStorage.setItem("portfolio_saved_reports_global", JSON.stringify(filtered));
    localStorage.setItem("portfolio_saved_reports_current", JSON.stringify(filtered));

    const cached = sessionStorage.getItem("portfolioReport");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.shareId === shareId) {
        sessionStorage.removeItem("portfolioReport");
      }
    }
  } catch (_) {}
}
