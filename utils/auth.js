import crypto from "node:crypto";
import { getAccount } from "../services/accountService.js";

const secret = () => process.env.JWT_SECRET || "local-development-secret-change-before-production";

export function issueToken(user) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export async function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const [encoded, signature] = token.split(".");
    const expected = crypto.createHmac("sha256", secret()).update(encoded || "").digest("base64url");
    if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      req.user = null;
      return next();
    }
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) {
      req.user = null;
      return next();
    }
    const user = await getAccount(payload.sub);
    req.user = user || null;
    return next();
  } catch {
    req.user = null;
    return next();
  }
}

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Create a free account to run an analysis." });
  try {
    const [encoded, signature] = token.split(".");
    const expected = crypto.createHmac("sha256", secret()).update(encoded || "").digest("base64url");
    if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Invalid token");
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) throw new Error("Expired token");
    const user = await getAccount(payload.sub);
    if (!user) return res.status(401).json({ message: "Your session has expired. Please sign in again." });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}
