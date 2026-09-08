import { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/errors";

// Doc 18 §18.1 canonical roles.
export type Role =
  | "ADMINISTRATOR"
  | "FINANCE_MANAGER"
  | "FINANCE_EXECUTIVE"
  | "APPROVER"
  | "READ_ONLY";

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.auth?.role as Role | undefined;
    if (!role || !allowed.includes(role)) {
      return next(ApiError.forbidden());
    }
    next();
  };
}
