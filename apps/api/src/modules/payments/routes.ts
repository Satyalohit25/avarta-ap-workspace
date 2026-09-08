import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { requireIdempotencyKey } from "../../middleware/idempotency";
import { executeHandler, listHandler, scheduleHandler } from "./controller";

export const paymentRoutes = Router();
paymentRoutes.use(requireAuth);

paymentRoutes.get("/", listHandler);
paymentRoutes.post(
  "/",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  requireIdempotencyKey,
  scheduleHandler
);
paymentRoutes.post(
  "/:paymentId/execute",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  requireIdempotencyKey,
  executeHandler
);

