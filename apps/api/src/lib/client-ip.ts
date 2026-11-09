import type { Request } from "express";

/**
 * Resolve the client IP used for rate limiting and login lockouts.
 *
 * X-Forwarded-For is attacker-controlled unless a trusted reverse proxy sets
 * it, so it is only honoured when TRUST_PROXY=true. Otherwise the socket
 * address is used (Express's `trust proxy` defaults to off).
 */
export function getClientIp(req: Request): string {
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = req.headers["x-forwarded-for"];
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
    if (first && first.trim().length > 0) return first.trim();
  }
  return req.ip || req.socket.remoteAddress || "anonymous";
}
