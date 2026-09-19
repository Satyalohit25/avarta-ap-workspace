import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { idempotent } from "../../middleware/idempotency";
import { batchRunHandler, executeHandler, listHandler, scheduleHandler } from "./controller";

export const paymentRoutes = Router();
paymentRoutes.use(requireAuth);

paymentRoutes.get("/", listHandler);
paymentRoutes.post(
  "/",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  idempotent,
  scheduleHandler
);
paymentRoutes.post(
  "/batch/run",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  idempotent,
  batchRunHandler
);
paymentRoutes.post(
  "/:paymentId/execute",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  idempotent,
  executeHandler
);

