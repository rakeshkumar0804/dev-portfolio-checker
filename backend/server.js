import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import analyzeRoutes from "./routes/analyzeRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import { connectDatabase } from "./utils/connectDatabase.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded resumes statically (temp)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Developer Portfolio Health Checker API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/analyze", analyzeRoutes);
app.use("/api/resume", resumeRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res
    .status(err.statusCode || 500)
    .json({ message: err.message || "Internal server error" });
});

connectDatabase().then(() => {
  app.listen(port, () =>
    console.log(
      `🚀 Developer Portfolio Health Checker API running on http://localhost:${port}`
    )
  );
});

