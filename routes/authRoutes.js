import express from "express";
import { login, me, recentReports, register, saveReportToAccount, deleteReport } from "../controllers/authController.js";
import { requireAuth } from "../utils/auth.js";

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.get("/reports", requireAuth, recentReports);
router.post("/save-report", requireAuth, saveReportToAccount);
router.delete("/report/:shareId", requireAuth, deleteReport);

export default router;
