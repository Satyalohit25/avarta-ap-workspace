import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { approveHandler, listHandler, rejectHandler } from "./controller";

export const approvalRoutes = Router();
approvalRoutes.use(requireAuth);

approvalRoutes.get("/", listHandler);
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

