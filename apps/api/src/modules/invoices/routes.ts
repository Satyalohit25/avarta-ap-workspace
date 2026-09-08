import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { upload } from "../../lib/upload";
import {
  createHandler,
  getDocumentFileHandler,
  getHandler,
  listHandler,
  updateHandler,
  processHandler,
  transitionHandler,
  erpSyncHandler,
} from "./controller";

export const invoiceRoutes = Router();

invoiceRoutes.use(requireAuth);

invoiceRoutes.get("/needs-attention", listHandler);
invoiceRoutes.get("/", listHandler);
invoiceRoutes.post(
  "/",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  upload.single("file"),
  createHandler
);
invoiceRoutes.get("/:invoiceId", getHandler);
invoiceRoutes.put(
  "/:invoiceId",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  updateHandler
);
invoiceRoutes.get("/:invoiceId/documents/:documentId/file", getDocumentFileHandler);
invoiceRoutes.post(
  "/:invoiceId/process",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  processHandler
);
invoiceRoutes.post(
  "/:invoiceId/transitions",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER", "FINANCE_EXECUTIVE"),
  transitionHandler
);
invoiceRoutes.post(
  "/:invoiceId/erp-sync",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  erpSyncHandler
);

