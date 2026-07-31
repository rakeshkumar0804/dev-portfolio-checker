import axios from "axios";

const api = axios.create({ baseURL: "/api" });

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
