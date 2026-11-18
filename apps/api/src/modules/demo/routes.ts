import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { resetDemoHandler } from "./controller";

export const demoRoutes = Router();

// AGENTS.md & Production Hardening: strictly disable demo routes in production and require ENABLE_DEMO=true
demoRoutes.use((_req, res, next) => {
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_DEMO !== "true") {
    return res.status(403).json({
      error: "Forbidden",
      message: "Demo endpoints and dataset manipulation are disabled. Set ENABLE_DEMO=true in non-production environments to enable.",
    });
  }
  next();
});

demoRoutes.use(requireAuth);

demoRoutes.post(
  "/reset",
  requireRole("ADMINISTRATOR"),
  resetDemoHandler
);

