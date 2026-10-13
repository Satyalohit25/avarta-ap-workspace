import { Request, Response, NextFunction } from "express";
import { checkCanCreateInvoice, checkCanInviteUser, getTenantUsage } from "./service";
import { PlanFeatures } from "./plans";
import { ApiError } from "../../lib/errors";

export async function enforceInvoiceQuota(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth?.organizationId || (req as any).user?.organizationId;
    if (!orgId) {
      return next(ApiError.unauthorized("Authentication required to verify invoice quota"));
    }
    await checkCanCreateInvoice(orgId);
    next();
  } catch (err) {
    next(err);
  }
}

export async function enforceSeatLimit(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth?.organizationId || (req as any).user?.organizationId;
    if (!orgId) {
      return next(ApiError.unauthorized("Authentication required to verify seat quota"));
    }
    await checkCanInviteUser(orgId);
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePlanFeature(featureKey: keyof PlanFeatures) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.auth?.organizationId || (req as any).user?.organizationId;
      if (!orgId) {
        return next(ApiError.unauthorized("Authentication required"));
      }
      const usage = await getTenantUsage(orgId);
      if (!usage.features[featureKey]) {
        return next(
          ApiError.forbidden(
            `Feature '${String(featureKey)}' is not available on your current ${usage.plan.name} plan. Upgrade to access.`
          )
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
