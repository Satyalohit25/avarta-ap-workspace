import cors from "cors";
import { RequestHandler } from "express";

export function buildAllowedOrigins(
  envWebOrigin?: string,
  nodeEnv: string = process.env.NODE_ENV || "development"
): Set<string> {
  const allowed = new Set<string>();

  // Aggregate configured origins from parameter, WEB_ORIGIN, CLIENT_APP_URL, and APP_URL
  const rawOrigins = [
    envWebOrigin,
    process.env.WEB_ORIGIN,
    process.env.CLIENT_APP_URL,
    process.env.APP_URL,
  ]
    .filter(Boolean)
    .join(",");

  for (const entry of rawOrigins.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    if (trimmed === "*") {
      if (nodeEnv === "production") {
        console.warn(
          "[SECURITY VIOLATION] Wildcard '*' CORS origin is strictly prohibited in production with credentials. Ignoring."
        );
      } else {
        allowed.add("*");
      }
      continue;
    }

    try {
      const parsed = new URL(trimmed);
      allowed.add(parsed.origin.toLowerCase());
    } catch {
      // Clean trailing slashes if raw domain/protocol provided
      allowed.add(trimmed.replace(/\/+$/, "").toLowerCase());
    }
  }

  // Automatic local development fallbacks (disabled in production)
  if (nodeEnv !== "production") {
    allowed.add("http://localhost:5173");
    allowed.add("http://127.0.0.1:5173");
    allowed.add("http://localhost:4173");
    allowed.add("http://127.0.0.1:4173");
    allowed.add("http://localhost:3000");
  }

  return allowed;
}

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: Set<string>,
  nodeEnv: string = process.env.NODE_ENV || "development"
): boolean {
  // Allow non-browser requests (e.g. server-to-server curl, health checks)
  if (!origin) {
    return true;
  }

  // Explicitly reject literal "null" (sandboxed iframe / data URI attack)
  if (origin === "null") {
    return false;
  }

  let normalized: string;
  try {
    normalized = new URL(origin).origin.toLowerCase();
  } catch {
    normalized = origin.toLowerCase().replace(/\/+$/, "");
  }

  if (allowedOrigins.has("*") && nodeEnv !== "production") {
    return true;
  }

  return allowedOrigins.has(normalized);
}

export function createCorsMiddleware(
  envWebOrigin?: string,
  nodeEnv: string = process.env.NODE_ENV || "development"
): RequestHandler {
  const allowedOrigins = buildAllowedOrigins(envWebOrigin, nodeEnv);

  return cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (isOriginAllowed(origin, allowedOrigins, nodeEnv)) {
        return callback(null, true);
      }
      // Rejection: return callback(null, false) so Access-Control-Allow-Origin header is omitted
      return callback(null, false);
    },
    credentials: true,
    // Let the browser read download metadata for CSV exports.
    exposedHeaders: ["Content-Disposition", "X-Export-Row-Count", "X-Export-Truncated"],
  });
}
