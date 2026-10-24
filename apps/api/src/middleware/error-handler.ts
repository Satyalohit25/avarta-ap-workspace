import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../lib/errors";

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
  if ((err as any)?.code === "P2025") {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Entity not found",
        requestId: req.requestId,
      },
    });
  }

  // Tenant Guard Violation: Log distinctly for SIEM / monitoring
  if ((err as any)?.isTenantGuardViolation) {
    console.error(
      `[SECURITY AUDIT] [TENANT GUARD VIOLATION] ${req.method} ${req.originalUrl || req.url} ` +
      `attempted unguarded ${((err as any).targetAction || "action")} on ${((err as any).targetModel || "model")}. ` +
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
