import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { getSettingsHandler, updateSettingsHandler } from "./controller";

export const organizationRoutes = Router();

organizationRoutes.use(requireAuth);

organizationRoutes.get("/settings", getSettingsHandler);
organizationRoutes.patch(
  "/settings",
  requireRole("ADMINISTRATOR"),
  updateSettingsHandler
);
