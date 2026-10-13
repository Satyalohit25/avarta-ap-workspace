import { Router } from "express";
import {
  loginHandler,
  meHandler,
  listTeamHandler,
  inviteTeamHandler,
  deactivateTeamHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from "./controller";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { authRateLimiter } from "../../middleware/rate-limiter";
import { enforceSeatLimit } from "../billing/middleware";

export const authRoutes = Router();

authRoutes.post("/login", authRateLimiter, loginHandler);
authRoutes.get("/me", requireAuth, meHandler);

// Team management endpoints
authRoutes.get("/team", requireAuth, listTeamHandler);
authRoutes.post(
  "/team/invite",
  requireAuth,
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  enforceSeatLimit,
  inviteTeamHandler
);
authRoutes.post(
  "/team/:userId/deactivate",
  requireAuth,
  requireRole("ADMINISTRATOR"),
  deactivateTeamHandler
);

// Account recovery & password reset endpoints
authRoutes.post("/forgot-password", authRateLimiter, forgotPasswordHandler);
authRoutes.post("/reset-password", authRateLimiter, resetPasswordHandler);


