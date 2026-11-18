import { Router } from "express";
import {
  loginHandler,
  logoutHandler,
  signupHandler,
  refreshHandler,
  meHandler,
  updateMeHandler,
  listTeamHandler,
  inviteTeamHandler,
  acceptInviteHandler,
  deactivateTeamHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  authConfigHandler,
  mfaEnrollHandler,
  mfaEnableHandler,
  mfaDisableHandler,
  mfaRegenerateRecoveryCodesHandler,
  mfaChallengeHandler,
} from "./controller";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { authRateLimiter } from "../../middleware/rate-limiter";
import { enforceSeatLimit } from "../billing/middleware";

export const authRoutes = Router();

authRoutes.get("/config", authConfigHandler);
authRoutes.post("/signup", authRateLimiter, signupHandler);
authRoutes.post("/register", authRateLimiter, signupHandler);
authRoutes.post("/login", authRateLimiter, loginHandler);
authRoutes.post("/refresh", authRateLimiter, refreshHandler);
authRoutes.post("/logout", requireAuth, logoutHandler);
authRoutes.get("/me", requireAuth, meHandler);
authRoutes.patch("/me", requireAuth, updateMeHandler);

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

// Public invitation acceptance (the invitee has no session yet).
authRoutes.post("/invite/accept", authRateLimiter, acceptInviteHandler);

// Account recovery & password reset endpoints
authRoutes.post("/forgot-password", authRateLimiter, forgotPasswordHandler);
authRoutes.post("/reset-password", authRateLimiter, resetPasswordHandler);

// T-105: Multi-Factor Authentication (MFA / TOTP)
authRoutes.post("/mfa/enroll", requireAuth, mfaEnrollHandler);
authRoutes.post("/mfa/enable", requireAuth, mfaEnableHandler);
authRoutes.post("/mfa/disable", requireAuth, mfaDisableHandler);
authRoutes.post("/mfa/recovery-codes", requireAuth, mfaRegenerateRecoveryCodesHandler);
authRoutes.post("/mfa/challenge", authRateLimiter, mfaChallengeHandler);



