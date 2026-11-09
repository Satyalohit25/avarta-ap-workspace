import { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/errors";
import { verifyAccessTokenAsync } from "../lib/jwt";
import { authenticateApiKey } from "../modules/api_keys/service";

// Endpoints that a workspace API key must never drive. API keys are for
// invoice/supplier ingestion, not for reconfiguring the tenant, managing
// billing, or minting more credentials. Paths are stored relative to the API
// mount so both `/api/v1` and the legacy `/api` mount are blocked.
const API_KEY_BLOCKED_PATHS = [
  "/auth",
  "/billing",
  "/settings",
  "/integrations",
  "/organization",
  "/api-keys",
  "/demo",
  "/notifications/preferences",
  "/notifications/test-",
  "/data-export",
];

export function apiKeyPathIsBlocked(originalUrl: string): boolean {
  const path = originalUrl.replace(/^\/api(?:\/v1)?/, "");
  return API_KEY_BLOCKED_PATHS.some((prefix) => path.startsWith(prefix));
}

function isApiKeyBlocked(req: Request): boolean {
  return apiKeyPathIsBlocked(req.originalUrl || req.url);
}

// Doc 14 §14.45: the server never accepts organizationId from the client
// as authority — it is always derived here, from the verified token, and
// every downstream repository query must use req.auth.organizationId.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : typeof req.query.token === "string"
    ? req.query.token
    : null;

  if (!token) {
    return next(ApiError.unauthorized());
  }

  if (token.startsWith("apk_")) {
    try {
      const payload = await authenticateApiKey(token);
      if (isApiKeyBlocked(req)) {
        return next(
          ApiError.forbidden(
            "API keys cannot be used to change workspace settings, billing, integrations, or credentials."
          )
        );
      }
      req.auth = { ...payload, isApiKey: true };
      return next();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid or revoked API key";
      return next(ApiError.unauthorized(message));
    }
  }

  try {
    req.auth = await verifyAccessTokenAsync(token);
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid or expired token";
    next(ApiError.unauthorized(message));
  }
}
