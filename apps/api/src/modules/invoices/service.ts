import path from "path";
import { ExceptionType } from "@prisma/client";
import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { applyTransition, startWorkflow } from "../../workflow/engine";
import { extractInvoiceFromFile } from "../../ai/extractor";
import * as repo from "./repository";
import { toInvoiceDetail, toInvoiceListItem } from "./mapper";

interface ListParams {
  organizationId: string;
  status?: string;
  supplierId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listInvoices(params: ListParams) {
  const { page, pageSize } = parsePagination({ page: params.page, pageSize: params.pageSize });
  const { rows, total } = await repo.listInvoices({
    organizationId: params.organizationId,
    status: params.status,
    supplierId: params.supplierId,
    search: params.search,
    page,
    pageSize,
  });
  return {
    data: rows.map(toInvoiceListItem),
    meta: paginationMeta(page, pageSize, total),
  };
}

export async function getInvoice(organizationId: string, id: string) {
  const invoice = await repo.findInvoiceById(organizationId, id);
  if (!invoice) throw ApiError.notFound("Invoice not found");

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      entityId: id,
    },
    orderBy: { createdAt: "asc" },
  });

  return toInvoiceDetail({
    ...invoice,
    auditLogs,
  } as unknown as never);
}

interface CreateInvoiceInput {
  organizationId: string;
  supplierId?: string | null;
  invoiceNumber: string;
  invoiceDate?: string | null;
  dueDate?: string | null;
  currency: string;
  subtotalAmount?: string | number;
  taxAmount?: string | number;
  totalAmount: string | number;
  purchaseOrderId?: string | null;
  source?: "UPLOAD" | "EMAIL" | "PORTAL" | "SCANNER" | "MOBILE" | "API" | "EDI" | "ERP";
  lines?: Array<{
    lineNumber?: number;
    description: string;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
    lineAmount: number;
  }>;
  file?: {
    fileName: string;
    mimeType: string;
    storageKey: string;
    fileSize: number;
  };
}

export interface UpdateInvoiceInput {
  organizationId: string;
  invoiceId: string;
  supplierId?: string | null;
  invoiceNumber?: string;
  invoiceDate?: string | null;
  dueDate?: string | null;
  currency?: string;
  subtotalAmount?: string | number;
  taxAmount?: string | number;
  totalAmount?: string | number;
  purchaseOrderId?: string | null;
  lines?: Array<{
    lineNumber?: number;
    description: string;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
    lineAmount: number;
  }>;
}

export async function updateInvoice(input: UpdateInvoiceInput) {
  const existing = await repo.findInvoiceById(input.organizationId, input.invoiceId);
  if (!existing) throw ApiError.notFound("Invoice not found");

  const updateData: Record<string, unknown> = {};
  if (input.supplierId !== undefined) updateData.supplierId = input.supplierId || null;
  if (input.invoiceNumber !== undefined) updateData.invoiceNumber = input.invoiceNumber;
  if (input.invoiceDate !== undefined) updateData.invoiceDate = input.invoiceDate ? new Date(input.invoiceDate) : null;
  if (input.dueDate !== undefined) updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.subtotalAmount !== undefined) updateData.subtotalAmount = input.subtotalAmount;
  if (input.taxAmount !== undefined) updateData.taxAmount = input.taxAmount;
  if (input.totalAmount !== undefined) updateData.totalAmount = input.totalAmount;
  if (input.purchaseOrderId !== undefined) updateData.purchaseOrderId = input.purchaseOrderId || null;

  return prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: input.invoiceId },
      data: updateData,
    });

    if (input.lines && input.lines.length > 0) {
      await tx.invoiceLine.deleteMany({
        where: { invoiceId: input.invoiceId },
      });

      await tx.invoiceLine.createMany({
        data: input.lines.map((l, idx) => ({
          invoiceId: input.invoiceId,
          lineNumber: l.lineNumber ?? idx + 1,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxAmount: l.taxAmount ?? 0,
          lineAmount: l.lineAmount,
        })),
      });
    }

    const fullInvoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, organizationId: input.organizationId },
      include: {
        supplier: true,
        workflowInstance: true,
        exceptions: true,
        documents: true,
        lines: true,
        validations: true,
      },
    });

    return toInvoiceDetail(fullInvoice as unknown as never);
  });
}

// Doc 04 Stage 1 (Receive Invoice) + Stage 2 (Capture) entry point.
export async function createInvoice(input: CreateInvoiceInput) {
  const actualSource = input.source ?? (input.file ? "UPLOAD" : "PORTAL");

  const invoice = await repo.createInvoice(input.organizationId, {
    supplierId: input.supplierId || undefined,
    invoiceNumber: input.invoiceNumber,
    invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : new Date(),
    dueDate: input.dueDate ? new Date(input.dueDate) : new Date(Date.now() + 30 * 86400000),
    currency: input.currency,
    subtotalAmount: input.subtotalAmount ?? 0,
    taxAmount: input.taxAmount ?? 0,
    totalAmount: input.totalAmount,
    purchaseOrderId: input.purchaseOrderId || undefined,
    source: actualSource,
    status: "RECEIVED",
    workflowState: "RECEIVED",
  } as unknown as never);

  if (input.lines && input.lines.length > 0) {
    await prisma.invoiceLine.createMany({
      data: input.lines.map((l, idx) => ({
        invoiceId: invoice.id,
        lineNumber: l.lineNumber ?? idx + 1,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxAmount: l.taxAmount ?? 0,
        lineAmount: l.lineAmount,
      })),
    });
  }

  if (input.file) {
    await prisma.document.create({
      data: {
        invoiceId: invoice.id,
        fileName: input.file.fileName,
        mimeType: input.file.mimeType,
        storageKey: input.file.storageKey,
        fileSize: input.file.fileSize,
        ocrStatus: "COMPLETED",
        extractionStatus: "COMPLETED",
      },
    });
  }

  await startWorkflow(invoice.id);

  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      action: "INVOICE_RECEIVED",
      entityType: "invoice",
      entityId: invoice.id,
      afterData: { invoiceNumber: input.invoiceNumber, source: actualSource },
    },
  });

  return getInvoice(input.organizationId, invoice.id);
}

/**
 * Mock capture + validate + match pipeline, run synchronously for this
 * slice (the real spec, Doc 09/12, runs this as an async background job —
 * see docs/16-roadmap.md Phase 3/4 for what a real implementation adds:
 * a real OCR/AI provider behind ai/, and a job queue instead of an
 * inline await chain).
 */
export async function processInvoice(organizationId: string, invoiceId: string, userId?: string) {
  const invoice = await repo.findInvoiceById(organizationId, invoiceId);
  if (!invoice) throw ApiError.notFound("Invoice not found");

  // Capture
  await applyTransition({ invoiceId, event: "CAPTURE_COMPLETE", triggeredBy: userId });

  // Document AI Extraction (Multimodal or Statutory Heuristic)
  let confidence = mockConfidence(invoice.invoiceNumber);
  const document = await prisma.document.findFirst({
    where: { invoiceId },
    orderBy: { createdAt: "desc" },
  });

  if (document) {
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");
      const filePath = path.join(uploadsDir, document.storageKey);
      const extracted = await extractInvoiceFromFile(filePath, document.mimeType, document.fileName);
      confidence = Math.round(extracted.overallConfidence * 100) / 100;

      // Match supplier if not already assigned
      let supplierId = invoice.supplierId;
      if (!supplierId && extracted.supplier?.name) {
        const foundSupplier = await prisma.supplier.findFirst({
          where: {
            organizationId,
            OR: [
              ...(extracted.supplier.gstin ? [{ gstNumber: extracted.supplier.gstin }] : []),
              { displayName: { contains: extracted.supplier.name, mode: "insensitive" } },
              { legalName: { contains: extracted.supplier.name, mode: "insensitive" } },
            ],
          },
        });
        if (foundSupplier) supplierId = foundSupplier.id;
      }

      // Match Purchase Order if extracted
      let purchaseOrderId = invoice.purchaseOrderId;
      if (!purchaseOrderId && extracted.purchaseOrderNumber) {
        const foundPo = await prisma.purchaseOrder.findFirst({
          where: {
            organizationId,
            poNumber: extracted.purchaseOrderNumber,
          },
        });
        if (foundPo) purchaseOrderId = foundPo.id;
      }

      // Populate extracted line items if invoice has no lines
      const existingLineCount = await prisma.invoiceLine.count({ where: { invoiceId } });
      if (existingLineCount === 0 && extracted.lines && extracted.lines.length > 0) {
        await prisma.invoiceLine.createMany({
          data: extracted.lines.map((l) => ({
            invoiceId,
            lineNumber: l.lineNumber,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineAmount: l.lineAmount,
          })),
        });
      }

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          aiConfidence: confidence,
          supplierId: supplierId ?? undefined,
          purchaseOrderId: purchaseOrderId ?? undefined,
          totalAmount: invoice.totalAmount ? undefined : extracted.totalAmount,
          subtotalAmount: invoice.subtotalAmount ? undefined : extracted.subtotal,
          taxAmount: invoice.taxAmount ? undefined : extracted.taxAmount,
        },
      });
    } catch (err) {
      console.warn("Document AI extraction fallback:", err);
      await prisma.invoice.update({ where: { id: invoiceId }, data: { aiConfidence: confidence } });
    }
  } else {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { aiConfidence: confidence } });
  }

  // Validate
  await applyTransition({ invoiceId, event: "VALIDATION_START", triggeredBy: userId });
  const validationFailures = await runValidations(organizationId, invoice, confidence);

  if (validationFailures.length > 0) {
    await applyTransition({ invoiceId, event: "VALIDATION_FAILURE", triggeredBy: userId });
    await createExceptionsForFailures(organizationId, invoiceId, validationFailures);
    return getInvoice(organizationId, invoiceId);
  }

  await applyTransition({ invoiceId, event: "VALIDATION_SUCCESS", triggeredBy: userId });

  // Match (Doc 04 Stage 4: 3-Way Matching PO <-> GRN <-> Invoice per Tata Chemicals standard)
  await applyTransition({ invoiceId, event: "MATCHING_START", triggeredBy: userId });

  if (invoice.purchaseOrderId) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: invoice.purchaseOrderId },
      include: {
        goodsReceipts: {
          include: { lines: true },
        },
      },
    });

    // Rule 1: PO Closed for Receiving check (Tata Chemicals Slide 8)
    if (po && (po.status === "CLOSED_FOR_RECEIVING" || po.closedForReceiving)) {
      const remaining = Number(po.remainingAmount);
      const invoiceTotal = Number(invoice.totalAmount);
      if (invoiceTotal > remaining) {
        await applyTransition({ invoiceId, event: "MATCHING_FAILURE", triggeredBy: userId });
        await prisma.exception.create({
          data: {
            organizationId,
            invoiceId,
            type: "PRICE_DIFFERENCE",
            severity: "HIGH",
            title: "PO Closed for Receiving — Liability Cap Exceeded",
            description: `Purchase Order ${po.poNumber} is marked 'Closed for Receiving'. Billed amount ($${invoiceTotal}) exceeds remaining balance ($${remaining}).`,
            status: "OPEN",
          },
        });
        return getInvoice(organizationId, invoiceId);
      }
    }

    // Rule 2: 3-Way Line Match with GRN and Negative Return Quantities (Tata Chemicals Slide 8)
    if (po && po.goodsReceipts.length > 0) {
      let netReceivedQty = 0;
      let totalReturnedQty = 0;

      for (const grn of po.goodsReceipts) {
        for (const line of grn.lines) {
          const qty = Number(line.receivedQuantity);
          if (qty < 0) {
            totalReturnedQty += Math.abs(qty);
          }
          netReceivedQty += qty;
        }
      }

      const lines = await prisma.invoiceLine.findMany({ where: { invoiceId } });
      const totalInvoicedQty = lines.reduce((acc, l) => acc + Number(l.quantity), 0);

      // Discrepancy check: Invoiced qty exceeds net accepted goods
      if (totalInvoicedQty > netReceivedQty && netReceivedQty > 0) {
        await applyTransition({ invoiceId, event: "MATCHING_FAILURE", triggeredBy: userId });
        await prisma.exception.create({
          data: {
            organizationId,
            invoiceId,
            type: "QUANTITY_DIFFERENCE",
            severity: "HIGH",
            title: "3-Way Match Failed: Goods Return / Rejection Detected on GRN",
            description: `Invoice bills for ${totalInvoicedQty} units, but Net Accepted GRN quantity is only ${netReceivedQty} units (${totalReturnedQty} units returned during Quality Inspection on GRN).`,
            status: "OPEN",
          },
        });
        return getInvoice(organizationId, invoiceId);
      }
    }

    await applyTransition({ invoiceId, event: "MATCHING_SUCCESS", triggeredBy: userId });
  } else {
    // Non-PO invoice matching
    await applyTransition({ invoiceId, event: "MATCHING_SUCCESS", triggeredBy: userId });
  }

  return getInvoice(organizationId, invoiceId);
}

function mockConfidence(seed: string): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 1000;
  return Math.round((60 + (hash % 40)) * 100) / 100; // 60.00–99.99
}

interface ValidationFailure {
  ruleCode: string;
  ruleName: string;
  message: string;
  exceptionType: ExceptionType;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

async function runValidations(
  organizationId: string,
  invoice: Record<string, unknown> & {
    id: string;
    supplierId?: string | null;
    invoiceNumber?: string;
    totalAmount?: number | string | unknown;
    subtotalAmount?: number | string | unknown;
    taxAmount?: number | string | unknown;
    currency?: string;
    purchaseOrderId?: string | null;
  },
  confidence: number
) {
  const failures: ValidationFailure[] = [];

  if (!invoice.supplierId) {
    failures.push({
      ruleCode: "VENDOR_EXISTS",
      ruleName: "Vendor Exists",
      message: "No supplier is linked to this invoice.",
      exceptionType: "MISSING_REQUIRED_FIELD",
      severity: "HIGH",
    });
  }

  const duplicate = await prisma.invoice.findFirst({
    where: {
      organizationId,
      id: { not: invoice.id },
      invoiceNumber: invoice.invoiceNumber,
      supplierId: invoice.supplierId ?? undefined,
    },
  });
  if (duplicate) {
    failures.push({
      ruleCode: "DUPLICATE_CHECK",
      ruleName: "Duplicate Invoice",
      message: `Invoice ${invoice.invoiceNumber} already exists for this supplier.`,
      exceptionType: "DUPLICATE_INVOICE",
      severity: "HIGH",
    });
  }

  if (confidence < 80) {
    failures.push({
      ruleCode: "AI_CONFIDENCE",
      ruleName: "AI Confidence",
      message: `Extraction confidence (${confidence}%) is below the review threshold.`,
      exceptionType: "LOW_AI_CONFIDENCE",
      severity: "MEDIUM",
    });
  }

  // Always record a passing/failing row per rule for the Validation tab (Doc 06.4).
  const allRuleCodes = ["VENDOR_EXISTS", "DUPLICATE_CHECK", "AI_CONFIDENCE"];
  for (const ruleCode of allRuleCodes) {
    const failure = failures.find((f) => f.ruleCode === ruleCode);
    await prisma.validation.create({
      data: {
        invoiceId: invoice.id,
        ruleCode,
        ruleName: failure?.ruleName ?? ruleCode,
        status: failure ? "FAILED" : "PASSED",
        message: failure?.message,
      },
    });
  }

  return failures;
}

async function createExceptionsForFailures(
  organizationId: string,
  invoiceId: string,
  failures: ValidationFailure[]
) {
  for (const failure of failures) {
    await prisma.exception.create({
      data: {
        organizationId,
        invoiceId,
        type: failure.exceptionType,
        severity: failure.severity,
        title: failure.ruleName,
        description: failure.message,
        status: "OPEN",
      },
    });
  }
}

/** Doc 18 §18.4 — resolution path 1: automatic, via successful re-validation. */
export async function retryValidation(organizationId: string, invoiceId: string, userId?: string) {
  const invoice = await repo.findInvoiceById(organizationId, invoiceId);
  if (!invoice) throw ApiError.notFound("Invoice not found");

  const confidence = invoice.aiConfidence ? Number(invoice.aiConfidence) : mockConfidence(invoice.invoiceNumber);
  const failures = await runValidations(organizationId, invoice, confidence);

  if (failures.length > 0) {
    throw ApiError.badRequest("Validation still fails.", { failures });
  }

  await applyTransition({ invoiceId, event: "EXCEPTION_RESOLVED", triggeredBy: userId });
  await applyTransition({ invoiceId, event: "MATCHING_START", triggeredBy: userId });
  await applyTransition({ invoiceId, event: "MATCHING_SUCCESS", triggeredBy: userId });

  await prisma.exception.updateMany({
    where: { invoiceId, status: { in: ["OPEN", "ASSIGNED", "UNDER_REVIEW"] } },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  return getInvoice(organizationId, invoiceId);
}

export async function transitionInvoice(
  organizationId: string,
  invoiceId: string,
  action: "APPROVE" | "REJECT" | "RETRY_VALIDATION" | "RUN_MATCHING",
  userId?: string,
  comment?: string
) {
  if (action === "RETRY_VALIDATION") {
    return retryValidation(organizationId, invoiceId, userId);
  }

  const invoice = await repo.findInvoiceById(organizationId, invoiceId);
  if (!invoice) throw ApiError.notFound("Invoice not found");

  if (action === "APPROVE") {
    await applyTransition({ invoiceId, event: "APPROVED", triggeredBy: userId, reason: comment });
  } else if (action === "REJECT") {
    if (!comment) throw ApiError.badRequest("Comment is required for rejection.");
    await applyTransition({ invoiceId, event: "REJECTED", triggeredBy: userId, reason: comment });
  }

  return getInvoice(organizationId, invoiceId);
}

export async function syncInvoiceToErp(
  organizationId: string,
  invoiceId: string,
  targetErp?: string,
  userId?: string
) {
  const invoice = await repo.findInvoiceById(organizationId, invoiceId);
  if (!invoice) throw ApiError.notFound("Invoice not found");

  await applyTransition({
    invoiceId,
    event: "ERP_SUCCESS",
    triggeredBy: userId,
    reason: `Posted journal entry to ${targetErp ?? "ERP Connector"}`,
  });

  return getInvoice(organizationId, invoiceId);
}

