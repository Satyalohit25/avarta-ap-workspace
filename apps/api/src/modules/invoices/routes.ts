import { Router } from "express";
import { requireAuth, requireScope } from "../../middleware/auth";
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
  bulkApproveHandler,
  erpSyncHandler,
  uploadDocumentHandler,
  extractDocumentHandler,
  regenerateTrackingHandler,
  getTrackingHandler,
  overrideLineVarianceHandler,
  updateLineMatchStatusHandler,
  updateDecisionChecklistHandler,
} from "./controller";

import { enforceInvoiceQuota } from "../billing/middleware";

export const invoiceRoutes = Router();

invoiceRoutes.use(requireAuth);

invoiceRoutes.post(
  "/extract",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  requireScope("invoices:write"),
  upload.single("file"),
  extractDocumentHandler
);

invoiceRoutes.get("/needs-attention", requireScope("invoices:read"), needsAttentionHandler);
invoiceRoutes.get("/", requireScope("invoices:read"), listHandler);
invoiceRoutes.get("/:invoiceId/audit", requireScope("invoices:read"), auditHandler);
invoiceRoutes.post(
  "/",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  requireScope("invoices:write"),
  enforceInvoiceQuota,
  upload.single("file"),
  createHandler
);
invoiceRoutes.post(
  "/bulk-approve",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER"),
  requireScope("invoices:write"),
  requireIdempotencyKey,
  bulkApproveHandler
);

invoiceRoutes.get("/:invoiceId", requireScope("invoices:read"), getHandler);
invoiceRoutes.put(
  "/:invoiceId",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  requireScope("invoices:write"),
  updateHandler
);
invoiceRoutes.post(
  "/:invoiceId/documents",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  requireScope("invoices:write"),
  upload.single("file"),
  uploadDocumentHandler
);
invoiceRoutes.get("/:invoiceId/documents/:documentId/file", requireScope("invoices:read"), getDocumentFileHandler);
invoiceRoutes.post(
  "/:invoiceId/process",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  requireScope("invoices:write"),
  requireIdempotencyKey,
  processHandler
);
invoiceRoutes.post(
  "/:invoiceId/transitions",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER", "FINANCE_EXECUTIVE"),
  requireScope("invoices:write"),
  transitionHandler
);
invoiceRoutes.post(
  "/:invoiceId/erp-sync",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  requireScope("invoices:write"),
  requireIdempotencyKey,
  erpSyncHandler
);

// Operator tracking link fetch endpoint
invoiceRoutes.get(
  "/:invoiceId/tracking",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  getTrackingHandler
);

// Restricted regenerate tracking token endpoint (ADMINISTRATOR and FINANCE_MANAGER only)
invoiceRoutes.post(
  "/:invoiceId/tracking/regenerate",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  regenerateTrackingHandler
);

invoiceRoutes.patch(
  "/:invoiceId/lines/:lineId/override",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  requireScope("invoices:write"),
  overrideLineVarianceHandler
);

invoiceRoutes.patch(
  "/:invoiceId/lines/:lineId/match-status",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  requireScope("invoices:write"),
  updateLineMatchStatusHandler
);

invoiceRoutes.patch(
  "/:invoiceId/decision-hub",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER", "FINANCE_EXECUTIVE"),
  requireScope("invoices:write"),
  updateDecisionChecklistHandler
);


