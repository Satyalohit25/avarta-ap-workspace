import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { resetDemoHandler } from "./controller";

export const demoRoutes = Router();

// AGENTS.md & Production Hardening: strictly disable demo routes in production
demoRoutes.use((_req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      error: "Forbidden",
      message: "Demo endpoints and dataset manipulation are permanently disabled in production.",
    });
  }
  next();
});

demoRoutes.use(requireAuth);

demoRoutes.post(
  "/reset",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  resetDemoHandler
);

