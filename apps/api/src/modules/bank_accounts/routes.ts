import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { createHandler, listHandler, setPrimaryHandler, verifyHandler } from "./controller";

export const bankAccountRoutes = Router();
bankAccountRoutes.use(requireAuth);

bankAccountRoutes.get("/", listHandler);
bankAccountRoutes.post(
  "/",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  createHandler
);
bankAccountRoutes.post(
  "/:accountId/verify",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  verifyHandler
);
bankAccountRoutes.post(
  "/:accountId/primary",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  setPrimaryHandler
);
