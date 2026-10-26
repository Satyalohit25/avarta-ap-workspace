import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../lib/errors";
import { TenantGuardViolationError } from "../config/tenant-guard";

function hasErrorCode(err: unknown, code: string): err is { code: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === code
  );
}

// Doc 14 §14.7 standard error response shape.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId: req.requestId,
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.flatten(),
        requestId: req.requestId,
      },
    });
  }

  // Prisma P2025: "An operation failed because it depends on one or more records that were required but not found."
  // When updating via compound unique { id_organizationId }, a mismatched organizationId returns P2025.
  // We map it to 404 with an identical message to non-existent entities to prevent tenant enumeration.
  if (hasErrorCode(err, "P2025")) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Entity not found",
        requestId: req.requestId,
      },
    });
  }

  // Tenant Guard Violation: Log distinctly for SIEM / monitoring
  if (err instanceof TenantGuardViolationError) {
    console.error(
      `[SECURITY AUDIT] [TENANT GUARD VIOLATION] ${req.method} ${req.originalUrl || req.url} ` +
      `attempted unguarded ${err.targetAction || "action"} on ${err.targetModel || "model"}. ` +
      `Operator: ${req.auth?.userId || "unknown"} Org: ${req.auth?.organizationId || "none"} RequestId: ${req.requestId}`
    );
  } else {
    console.error(err);
  }

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
      requestId: req.requestId,
    },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.path}`,
      requestId: req.requestId,
    },
  });
}

