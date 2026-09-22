import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { resetDemoHandler } from "./controller";

export const demoRoutes = Router();
demoRoutes.use(requireAuth);

demoRoutes.post(
  "/reset",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  resetDemoHandler
);
