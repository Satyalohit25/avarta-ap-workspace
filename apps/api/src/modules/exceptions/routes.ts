import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { assignHandler, listHandler, resolveHandler } from "./controller";

export const exceptionRoutes = Router();
exceptionRoutes.use(requireAuth);

exceptionRoutes.get("/", listHandler);
exceptionRoutes.post(
  "/:exceptionId/assign",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  assignHandler
);
exceptionRoutes.post(
  "/:exceptionId/resolve",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  resolveHandler
);

