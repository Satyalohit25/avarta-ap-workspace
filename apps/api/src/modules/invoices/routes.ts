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
  archiveInvoiceHandler,
  erpSyncHandler,
  uploadDocumentHandler,
  extractDocumentHandler,
  regenerateTrackingHandler,
  getTrackingHandler,
  overrideLineVarianceHandler,
  updateLineMatchStatusHandler,
  updateDecisionChecklistHandler,
  gstr2bReconcileHandler,
  validateIrnHandler,
  calculateInvoiceTdsHandler,
  msme43bhReportHandler,
  tdsSummaryReportHandler,
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
invoiceRoutes.post(
  "/gstr2b/reconcile",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  requireScope("invoices:read"),
  gstr2bReconcileHandler
);
invoiceRoutes.get("/", requireScope("invoices:read"), listHandler);

// Statutory Compliance Reports & Calculations (T-501, T-502)
invoiceRoutes.get("/compliance/msme-43bh", requireRole("ADMINISTRATOR", "FINANCE_MANAGER"), requireScope("invoices:read"), msme43bhReportHandler);
invoiceRoutes.get("/compliance/tds-summary", requireRole("ADMINISTRATOR", "FINANCE_MANAGER"), requireScope("invoices:read"), tdsSummaryReportHandler);
invoiceRoutes.post("/:invoiceId/calculate-tds", requireScope("invoices:read"), calculateInvoiceTdsHandler);
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
  "/:invoiceId/archive",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER"),
  requireScope("invoices:write"),
  archiveInvoiceHandler
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

invoiceRoutes.post(
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

// e-Invoice IRN & Signed QR Code validation endpoint
invoiceRoutes.post(
  "/:invoiceId/validate-irn",
  requireRole("ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"),
  requireScope("invoices:read"),
  validateIrnHandler
);


