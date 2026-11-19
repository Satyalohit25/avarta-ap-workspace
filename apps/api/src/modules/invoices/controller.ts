import fs from "fs";
import path from "path";
import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import { createInvoiceSchema, updateInvoiceSchema, listInvoicesQuerySchema, transitionSchema, bulkApproveSchema } from "./validation";
import * as invoiceService from "./service";
import { generateInvoicePdfBuffer } from "./pdfGenerator";

function orgId(req: Request): string {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth.organizationId;
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listInvoicesQuerySchema.parse(req.query);
    const result = await invoiceService.listInvoices({ organizationId: orgId(req), ...query });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function needsAttentionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listInvoicesQuerySchema.parse(req.query);
    const result = await invoiceService.listInvoices({
      organizationId: orgId(req),
      ...query,
      status: query.status ?? "EXCEPTION,PENDING_APPROVAL",
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoiceService.getInvoice(orgId(req), req.params.invoiceId);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createInvoiceSchema.parse(req.body);
    const fileInfo = req.file
      ? {
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          storageKey: req.file.filename,
          fileSize: req.file.size,
        }
      : undefined;

    const invoice = await invoiceService.createInvoice({
      organizationId: orgId(req),
      userId: req.auth?.userId,
      ...body,
      file: fileInfo,
    });
    res.status(201).json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = updateInvoiceSchema.parse(req.body);
    const invoice = await invoiceService.updateInvoice({
      organizationId: orgId(req),
      invoiceId: req.params.invoiceId,
      ...body,
    });
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentFileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.documentId,
        invoiceId: req.params.invoiceId,
        invoice: { organizationId: orgId(req) },
      },
      include: { invoice: { include: { supplier: true } } },
    });

    if (!document) {
      throw ApiError.notFound("Document not found");
    }

    const uploadsDir = path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Prevent directory traversal attacks (CWE-22)
    const safeStorageKey = path.basename(document.storageKey);
    const filePath = path.resolve(uploadsDir, safeStorageKey);
    if (!filePath.startsWith(uploadsDir)) {
      throw ApiError.forbidden("Access denied: invalid storage path");
    }
    if (!fs.existsSync(filePath)) {
      // Auto-generate statutory PDF voucher if seeded storage file is missing
      const pdfBuffer = generateInvoicePdfBuffer({
        invoiceNumber: document.invoice.invoiceNumber,
        vendorName:
          document.invoice.supplier?.displayName ||
          document.invoice.supplier?.legalName ||
          "Verified AP Supplier",
        totalAmount: Number(document.invoice.totalAmount) || 0,
        currency: document.invoice.currency || "INR",
        date: document.invoice.invoiceDate
          ? new Date(document.invoice.invoiceDate).toLocaleDateString("en-IN")
          : undefined,
      });
      fs.writeFileSync(filePath, pdfBuffer);
    }

    res.setHeader("Content-Type", document.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${document.fileName || `${document.invoice.invoiceNumber}.pdf`}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

export async function uploadDocumentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw ApiError.badRequest("No file uploaded");
    const result = await invoiceService.addDocumentToInvoice(
      orgId(req),
      req.params.invoiceId,
      {
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        storageKey: req.file.filename,
        fileSize: req.file.size,
      },
      req.auth?.userId
    );
    res.status(201).json({ data: result.document, invoice: result.invoice });
  } catch (err) {
    next(err);
  }
}

export async function extractDocumentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw ApiError.badRequest("No file uploaded");
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const filePath = path.resolve(uploadsDir, req.file.filename);
    const { extractInvoiceFromFile } = await import("../../ai/extractor");
    const extracted = await extractInvoiceFromFile(filePath, req.file.mimetype, req.file.originalname, orgId(req));
    res.json({ data: extracted });
  } catch (err) {
    next(err);
  }
}

export async function processHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoiceService.processInvoice(orgId(req), req.params.invoiceId, req.auth?.userId);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function transitionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = transitionSchema.parse(req.body);
    const invoice = await invoiceService.transitionInvoice(
      orgId(req),
      req.params.invoiceId,
      body.action,
      req.auth?.userId,
      body.comment,
      req.auth?.role,
      body.overrideSoloAdmin,
      body.overrideReason,
      body.confirmations,
      body.closePermanently
    );
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function bulkApproveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = bulkApproveSchema.parse(req.body);
    const result = await invoiceService.bulkApproveInvoices(
      orgId(req),
      body.invoiceIds,
      req.auth?.userId,
      req.auth?.role,
      body.notes
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function archiveInvoiceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoiceService.archiveInvoice(
      orgId(req),
      req.params.invoiceId,
      req.auth?.userId,
      req.body?.reason || req.body?.comment
    );
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}
  } catch (err) {
    next(err);
  }
}

export async function erpSyncHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoiceService.syncInvoiceToErp(
      orgId(req),
      req.params.invoiceId,
      req.body.targetErp,
      req.auth?.userId
    );
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function auditHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { listAuditLogs } = await import("../audit/service");
    const result = await listAuditLogs({
      organizationId: orgId(req),
      entityType: "invoice",
      entityId: req.params.invoiceId,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTrackingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await invoiceService.getInvoiceTrackingToken(
      orgId(req),
      req.params.invoiceId
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function regenerateTrackingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await invoiceService.regenerateInvoiceTrackingToken(
      orgId(req),
      req.params.invoiceId,
      req.auth?.userId
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function overrideLineVarianceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const { overrideAccepted, reason } = req.body;
    const result = await invoiceService.overrideLineVariance({
      organizationId: orgId(req),
      invoiceId: req.params.invoiceId,
      lineId: req.params.lineId,
      userId: req.auth.userId,
      userRole: req.auth.role,
      overrideAccepted: Boolean(overrideAccepted),
      reason,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateLineMatchStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const { matchStatus } = req.body;
    const result = await invoiceService.updateLineMatchStatus({
      organizationId: orgId(req),
      invoiceId: req.params.invoiceId,
      lineId: req.params.lineId,
      userId: req.auth.userId,
      userRole: req.auth.role,
      matchStatus,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateDecisionChecklistHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const { confirmations } = req.body;
    const result = await invoiceService.updateDecisionChecklist({
      organizationId: orgId(req),
      invoiceId: req.params.invoiceId,
      userId: req.auth.userId,
      confirmations: Array.isArray(confirmations) ? confirmations : [],
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function gstr2bReconcileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { content, format, tolerance } = req.body;
    if (!content) {
      throw ApiError.badRequest("GSTR-2B content (JSON or CSV string/object) is required.");
    }
    const result = await invoiceService.reconcileGstr2bWithWorkspace(
      orgId(req),
      content,
      format || "json",
      tolerance ? Number(tolerance) : 1.0
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function validateIrnHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await invoiceService.validateInvoiceIrn(
      orgId(req),
      req.params.invoiceId
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function calculateInvoiceTdsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { calculateTds } = await import("./tds");
    const invoice = await invoiceService.getInvoice(orgId(req), req.params.invoiceId);
    const supplier = invoice.supplier as (Record<string, unknown> | null | undefined);
    const supplierPan = (supplier?.panNumber as string | undefined) ||
      (typeof supplier?.gstin === "string" ? supplier.gstin.substring(2, 12) : undefined);
    const result = calculateTds({
      grossAmount: Number(invoice.totalAmount),
      sectionCode: req.body?.sectionCode || "194C",
      pan: supplierPan,
      isIndividualHuf: req.body?.isIndividualHuf,
      customRatePercent: req.body?.customRatePercent,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function msme43bhReportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { generateSection43BhReport, supplierMsmeStore } = await import("../suppliers/msme");
    const financialYear = (req.query.financialYear as string) || "2026-2027";
    const invoicesResult = await invoiceService.listInvoices({
      organizationId: orgId(req),
      pageSize: 500,
    });

    const reportInvoices = invoicesResult.data.map((inv: (typeof invoicesResult.data)[number]) => {
      const msme = inv.supplier ? supplierMsmeStore.getProfile(orgId(req), inv.supplier.id) : undefined;
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        supplierId: inv.supplier?.id || "",
        supplierName: inv.supplier?.name || "Unknown",
        supplierPan: inv.supplier?.gstin ? inv.supplier.gstin.substring(2, 12) : null,
        udyamNumber: msme?.udyamNumber || null,
        msmeCategory: msme?.msmeCategory || "NON_MSME",
        invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        amount: Number(inv.totalAmount),
        paidDate: inv.status === "PAID" ? new Date().toISOString().split("T")[0] : null,
        hasAgreement: msme?.hasWrittenAgreement ?? true,
      };
    });

    const report = generateSection43BhReport({
      financialYear,
      invoices: reportInvoices,
    });
    res.json({ data: report });
  } catch (err) {
    next(err);
  }
}

export async function tdsSummaryReportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { generateForm16ASummary, generateForm26QQuarterlySummary } = await import("./tds");
    const financialYear = (req.query.financialYear as string) || "FY 2026-27";
    const quarter = (req.query.quarter as "Q1" | "Q2" | "Q3" | "Q4") || "Q4";
    const supplierPan = req.query.supplierPan as string | undefined;

    if (supplierPan) {
      const form16A = generateForm16ASummary(orgId(req), supplierPan, financialYear, quarter);
      res.json({ data: form16A });
    } else {
      const form26Q = generateForm26QQuarterlySummary(orgId(req), financialYear, quarter);
      res.json({ data: form26Q });
    }
  } catch (err) {
    next(err);
  }
}

