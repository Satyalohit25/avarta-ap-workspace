import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { requireIdempotencyKey } from "../../middleware/idempotency";
import { upload } from "../../lib/upload";
import {
  auditHandler,
  createHandler,
  getDocumentFileHandler,
  getHandler,
  listHandler,
  needsAttentionHandler,
  updateHandler,
  processHandler,
  transitionHandler,
  erpSyncHandler,
  uploadDocumentHandler,
  extractDocumentHandler,
  regenerateTrackingHandler,
  getTrackingHandler,
} from "./controller";

import { enforceInvoiceQuota } from "../billing/middleware";

export const invoiceRoutes = Router();

invoiceRoutes.use(requireAuth);

invoiceRoutes.post(
  "/extract",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  upload.single("file"),
  extractDocumentHandler
);

invoiceRoutes.get("/needs-attention", needsAttentionHandler);
invoiceRoutes.get("/", listHandler);
invoiceRoutes.get("/:invoiceId/audit", auditHandler);
invoiceRoutes.post(
  "/",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  enforceInvoiceQuota,
  upload.single("file"),
  createHandler
);
invoiceRoutes.get("/:invoiceId", getHandler);
invoiceRoutes.put(
  "/:invoiceId",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  updateHandler
);
invoiceRoutes.post(
  "/:invoiceId/documents",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  upload.single("file"),
  uploadDocumentHandler
);
invoiceRoutes.get("/:invoiceId/documents/:documentId/file", getDocumentFileHandler);
invoiceRoutes.post(
  "/:invoiceId/process",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  requireIdempotencyKey,
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
  requireIdempotencyKey,
  erpSyncHandler
);

// Operator tracking link fetch endpoint
invoiceRoutes.get(
  "/:invoiceId/tracking",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER", "FINANCE_EXECUTIVE", "READ_ONLY"),
  getTrackingHandler
);

// Restricted regenerate tracking token endpoint (ADMINISTRATOR and FINANCE_MANAGER only)
invoiceRoutes.post(
  "/:invoiceId/tracking/regenerate",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  regenerateTrackingHandler
);


