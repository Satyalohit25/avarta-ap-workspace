import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { requireIdempotencyKey } from "../../middleware/idempotency";
import { approveHandler, listHandler, rejectHandler, bulkApproveHandler } from "./controller";

export const approvalRoutes = Router();
approvalRoutes.use(requireAuth);

approvalRoutes.get("/", listHandler);
approvalRoutes.post(
  "/bulk-approve",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER"),
  requireIdempotencyKey,
  bulkApproveHandler
);
approvalRoutes.post(
  "/:approvalId/approve",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER"),
  approveHandler
);
approvalRoutes.post(
  "/:approvalId/reject",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER"),
  rejectHandler
);

