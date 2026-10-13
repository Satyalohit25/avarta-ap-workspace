import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/authorize";
import { getTenantUsage, upgradeTenantPlan, getBillingReceipts } from "./service";
import { handleBillingWebhook } from "./webhooks";
import { SAAS_PLANS, PlanTier } from "./plans";

export const billingRoutes = Router();

// Public / webhook route (no JWT auth, verifies webhook signature/idempotency)
billingRoutes.post("/webhook", (req: Request, res: Response, next: NextFunction) => {
  handleBillingWebhook(req, res).catch(next);
});

// Authenticated billing management routes
billingRoutes.get("/plans", (_req: Request, res: Response) => {
  res.json({ data: Object.values(SAAS_PLANS) });
});

billingRoutes.get("/usage", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.organizationId;
    const usage = await getTenantUsage(orgId);
    res.json({ data: usage });
  } catch (err) {
    next(err);
  }
});

billingRoutes.get("/receipts", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.organizationId;
    const receipts = await getBillingReceipts(orgId);
    res.json({ data: receipts });
  } catch (err) {
    next(err);
  }
});

// Only Administrator or Finance Manager can upgrade/manage plans
billingRoutes.post(
  "/upgrade",
  authenticate,
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.organizationId;
      const { planTier } = req.body as { planTier: PlanTier };
      const updated = await upgradeTenantPlan(orgId, planTier);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);
