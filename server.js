import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import analyzeRoutes from "./routes/analyzeRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import { connectDatabase } from "./utils/connectDatabase.js";
import { apiRateLimit } from "./utils/rateLimit.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (!process.env.VERCEL && process.env.NODE_ENV !== "production") return true;
  if (origin.endsWith(".vercel.app")) return true;
  if (allowedOrigins.includes(origin)) return true;

  return false;
}

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  next();
});
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Developer Portfolio Health Checker API",
    version: "2.0.0",
    docs: "/api/health",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Developer Portfolio Health Checker API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", apiRateLimit());
app.use("/api/auth", authRoutes);
app.use("/api/analyze", analyzeRoutes);
app.use("/api/resume", resumeRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error",
  });
});

connectDatabase();

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(
      `🚀 Developer Portfolio Health Checker API running on http://localhost:${port}`,
    );
  });
}

export default app;
