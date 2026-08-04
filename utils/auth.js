import crypto from "node:crypto";
import { getAccount } from "../services/accountService.js";

const secret = () => process.env.JWT_SECRET || "local-development-secret-change-before-production";

export function issueToken(user) {
  const payloadData = {
    sub: String(user.id || user._id),
    name: user.name || "Developer",
    email: user.email || "",
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(payloadData)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyTokenPayload(token) {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = crypto.createHmac("sha256", secret()).update(encoded).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Date.now()) {
    return null;
  }

  return payload;
}

export async function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = verifyTokenPayload(token);
    if (!payload) {
      req.user = null;
      return next();
    }

    const dbUser = await getAccount(payload.sub);
    req.user = dbUser || {
      id: payload.sub,
      name: payload.name || "Developer",
      email: payload.email || "",
    };
    return next();
  } catch {
    req.user = null;
    return next();
  }
}

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Authentication required. Please sign in." });

  try {
    const payload = verifyTokenPayload(token);
    if (!payload) return res.status(401).json({ message: "Your session has expired. Please sign in again." });

    const dbUser = await getAccount(payload.sub);
    req.user = dbUser || {
      id: payload.sub,
      name: payload.name || "Developer",
      email: payload.email || "",
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}
