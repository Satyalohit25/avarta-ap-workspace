import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import {
  getPreferencesHandler,
  listHandler,
  markAllReadHandler,
  markReadHandler,
  testEmailHandler,
  testSlackHandler,
  updatePreferencesHandler,
} from "./controller";

export const notificationRoutes = Router();

notificationRoutes.use(requireAuth);

notificationRoutes.get("/", listHandler);
notificationRoutes.post(
  "/read-all",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE", "APPROVER"),
  markAllReadHandler
);
notificationRoutes.post(
  "/:notificationId/read",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE", "APPROVER"),
  markReadHandler
);

notificationRoutes.get("/preferences", getPreferencesHandler);
notificationRoutes.patch(
  "/preferences",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  updatePreferencesHandler
);
notificationRoutes.post(
  "/test-email",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  testEmailHandler
);
notificationRoutes.post(
  "/test-webhook",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  testSlackHandler
);
