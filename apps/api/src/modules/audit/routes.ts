import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { listHandler } from "./controller";

export const auditRoutes = Router();
auditRoutes.use(requireAuth);

auditRoutes.get("/", requireRole("ADMINISTRATOR", "FINANCE_MANAGER"), listHandler);
