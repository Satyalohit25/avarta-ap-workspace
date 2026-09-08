import { NextFunction, Request, Response } from "express";
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

  console.error(err);
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
      requestId: req.requestId,
    },
  });
}
