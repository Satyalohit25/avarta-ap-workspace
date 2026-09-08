import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { createHandler, getHandler, listHandler } from "./controller";

export const purchaseOrderRoutes = Router();
purchaseOrderRoutes.use(requireAuth);

purchaseOrderRoutes.get("/", listHandler);
purchaseOrderRoutes.get("/:poId", getHandler);
purchaseOrderRoutes.post(
  "/",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  createHandler
);
