import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import {
  createHandler,
  getHandler,
  listHandler,
  toggleReceivingHandler,
  recordGrnHandler,
} from "./controller";

export const purchaseOrderRoutes = Router();
purchaseOrderRoutes.use(requireAuth);

purchaseOrderRoutes.get("/", listHandler);
purchaseOrderRoutes.get("/:poId", getHandler);
purchaseOrderRoutes.post(
  "/",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  createHandler
);
purchaseOrderRoutes.post(
  "/:poId/receiving",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  toggleReceivingHandler
);
purchaseOrderRoutes.post(
  "/:poId/grn",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  recordGrnHandler
);
