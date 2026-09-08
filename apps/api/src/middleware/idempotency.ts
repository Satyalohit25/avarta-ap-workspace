import { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/errors";

/**
 * AGENTS.md Rule 5: Financial operations require idempotency keys.
 * Validates the presence of an Idempotency-Key (or X-Idempotency-Key) header.
 */
export function requireIdempotencyKey(req: Request, _res: Response, next: NextFunction) {
  const key = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
  if (!key || typeof key !== "string" || key.trim().length === 0) {
    return next(
      ApiError.badRequest(
        "Idempotency-Key header is required for financial operations."
      )
    );
  }
  next();
}
