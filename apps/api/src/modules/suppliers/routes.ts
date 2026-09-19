import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { createHandler, getHandler, listHandler } from "./controller";

export const supplierRoutes = Router();
supplierRoutes.use(requireAuth);

supplierRoutes.get("/", listHandler);
supplierRoutes.post(
  "/",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  createHandler
);
supplierRoutes.get("/:supplierId", getHandler);
