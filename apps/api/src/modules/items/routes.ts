import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { createHandler, listHandler, toggleStatusHandler } from "./controller";

export const itemRoutes = Router();
itemRoutes.use(requireAuth);

itemRoutes.get("/", listHandler);
itemRoutes.post(
  "/",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  createHandler
);
itemRoutes.post(
  "/:itemId/toggle-status",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  toggleStatusHandler
);
