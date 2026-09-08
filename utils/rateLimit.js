const clients = new Map();

export function resetRateLimits() {
  clients.clear();
}

export function apiRateLimit({
  windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max = parseInt(process.env.RATE_LIMIT_MAX, 10) || 40,
} = {}) {
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = clients.get(key);
    const recent = (entry?.requests || []).filter((time) => now - time < windowMs);

    if (recent.length >= max) {
      const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ message: "Too many requests. Please try again shortly." });
    }

    recent.push(now);
    clients.set(key, { requests: recent });
    return next();
  };
}
