import { Request, Response, NextFunction } from "express";

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface ClientRecord {
  timestamps: number[];
}

/**
 * Lightweight, zero-dependency in-memory sliding window rate limiter.
 * Protects auth endpoints against brute-force and API endpoints against DoS.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, message = "Too many requests. Please slow down and try again later." } = options;
  const clients = new Map<string, ClientRecord>();

  // Periodically clean up stale client IPs every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of clients.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        clients.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "anonymous";
    const now = Date.now();

    let record = clients.get(ip);
    if (!record) {
      record = { timestamps: [] };
      clients.set(ip, record);
    }

    // Filter out timestamps outside window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= maxRequests) {
      const retryAfterSec = Math.ceil((windowMs - (now - record.timestamps[0])) / 1000);
      res.setHeader("Retry-After", String(Math.max(1, retryAfterSec)));
      return res.status(429).json({
        error: "Too Many Requests",
        message,
        retryAfterSeconds: Math.max(1, retryAfterSec),
      });
    }

    record.timestamps.push(now);
    next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15,     // 15 attempts per minute
  message: "Too many login attempts from this IP. Please wait a minute before trying again.",
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 300,    // 300 requests per minute
});

export const publicTrackRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,     // 30 lookups per minute to prevent token/ID enumeration
  message: "Too many tracking lookups from this IP. Please wait a minute before trying again.",
});
