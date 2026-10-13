import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { resetDemoHandler } from "./controller";

export const demoRoutes = Router();
demoRoutes.use(requireAuth);

demoRoutes.post(
  "/reset",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  (req, res, next) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Demo scenario reset is permanently disabled in the production environment.",
      });
    }
    return resetDemoHandler(req, res, next);
  }
);
