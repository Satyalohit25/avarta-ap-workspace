import { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/errors";
import { prisma } from "../config/database";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * AGENTS.md Rule 5: Financial operations require idempotency keys.
 *
 * Phase 1 — validates header presence only (no DB lookup).
 * Use this on routes that need the header but don't need full dedup
 * (e.g., read-heavy endpoints that still require the key as a contract).
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

/**
 * Full DB-backed idempotency middleware.
 *
 * 1. Parses `Idempotency-Key` / `X-Idempotency-Key` from headers.
 * 2. Looks up the key in `idempotency_keys` table (scoped to org).
 * 3. If found with a stored response → replays the cached response (200).
 * 4. If found with null response → concurrent in-flight request (409).
 * 5. If not found → inserts a placeholder, calls next(), intercepts
 *    the response to cache statusCode + body, then sends.
 *
 * Requires `requireAuth` to have run first (needs `req.auth.organizationId`).
 */
export function idempotent(req: Request, res: Response, next: NextFunction) {
  const key = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;
  if (!key || key.trim().length === 0) {
    return next(
      ApiError.badRequest("Idempotency-Key header is required for financial operations.")
    );
  }

  const organizationId = req.auth?.organizationId;
  if (!organizationId) {
    return next(ApiError.unauthorized());
  }

  handleIdempotency(key.trim(), organizationId, req, res, next).catch(next);
}

async function handleIdempotency(
  key: string,
  organizationId: string,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Clean up expired keys (fire-and-forget, non-blocking)
  prisma.idempotencyKey
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {/* best-effort cleanup */});

  const existing = await prisma.idempotencyKey.findUnique({
    where: { key_organizationId: { key, organizationId } },
  });

  if (existing) {
    // Key exists — check if the original request has completed
    if (existing.statusCode !== null && existing.responseBody !== null) {
      // Replay cached response
      res.status(existing.statusCode).json(existing.responseBody);
      return;
    }
    // Original request still in-flight (responseBody is null)
    return next(
      ApiError.conflict(
        "A request with this idempotency key is already being processed. Please retry later."
      )
    );
  }

  // Insert placeholder — marks this key as in-flight
  try {
    await prisma.idempotencyKey.create({
      data: {
        key,
        organizationId,
        method: req.method,
        path: req.originalUrl,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
    });
  } catch (err: unknown) {
    // Unique constraint violation = race condition with another instance
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return next(
        ApiError.conflict(
          "A request with this idempotency key is already being processed. Please retry later."
        )
      );
    }
    throw err;
  }

  // Intercept the response to cache it
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    // Store the response asynchronously (fire-and-forget)
    prisma.idempotencyKey
      .update({
        where: { key_organizationId: { key, organizationId } },
        data: {
          statusCode: res.statusCode,
          responseBody: body as never,
        },
      })
      .catch(() => {/* If storage fails, the key stays in-flight and will expire */});

    return originalJson(body);
  }) as typeof res.json;

  next();
}
