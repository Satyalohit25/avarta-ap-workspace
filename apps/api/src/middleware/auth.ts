import { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/errors";
import { verifyAccessToken } from "../lib/jwt";

// Doc 14 §14.45: the server never accepts organizationId from the client
// as authority — it is always derived here, from the verified token, and
// every downstream repository query must use req.auth.organizationId.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : typeof req.query.token === "string"
    ? req.query.token
    : null;

  if (!token) {
    return next(ApiError.unauthorized());
  }
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}
