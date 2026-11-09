import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { exportDatasetHandler } from "./controller";

export const dataExportRoutes = Router();

dataExportRoutes.use(requireAuth);

// Exporting the register is a data-sovereignty escape hatch for tenants that
// connect their own database. Administrators and Finance Managers only.
dataExportRoutes.get(
  "/:dataset",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  exportDatasetHandler
);
