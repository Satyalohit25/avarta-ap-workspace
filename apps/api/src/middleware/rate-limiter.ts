import { Request, Response, NextFunction } from "express";
import { getClientIp } from "../lib/client-ip";
import { readRefreshCookie } from "../lib/refresh-cookie";
import crypto from "crypto";

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface ClientRecord {
  timestamps: number[];
}

/**
 * Lightweight, zero-dependency in-memory sliding window rate limiter.
 * Protects auth endpoints against brute-force and API endpoints against DoS.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, message = "Too many requests. Please slow down and try again later.", keyGenerator } = options;
  const clients = new Map<string, ClientRecord>();

  // Periodically clean up stale client IPs every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of clients.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        clients.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientKey = keyGenerator ? keyGenerator(req) : getClientIp(req);
    const now = Date.now();

    let record = clients.get(clientKey);
    if (!record) {
      record = { timestamps: [] };
      clients.set(clientKey, record);
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

export const refreshRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,     // 60 refreshes per minute per client/token
  message: "Too many refresh attempts. Please wait a minute before trying again.",
  keyGenerator: (req: Request) => {
    const ip = getClientIp(req);
    const token = readRefreshCookie(req) || req.body?.refreshToken;
    if (token) {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex").slice(0, 16);
      return `${ip}:${tokenHash}`;
    }
    return ip;
  },
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
