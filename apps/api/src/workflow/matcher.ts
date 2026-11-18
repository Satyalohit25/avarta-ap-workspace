import { prisma } from "../config/database";
import { applyTransition } from "./engine";

export interface GrnLineContext {
  lineNumber: number;
  description: string;
  receivedQuantity: number;
  status: "ACCEPTED" | "RETURNED" | "INSPECTION_PENDING" | string;
  inspectionNotes?: string | null;
  unitPrice?: number;
}

export interface PoLineContext {
  lineNumber: number;
  description?: string;
  unitPrice: number;
  quantity?: number;
}

export interface InvoiceLineMatchContext {
  lineNumber: number;
  description?: string;
  quantity: number;
  unitPrice: number;
  lineAmount?: number;
}

export interface PurchaseOrderMatchContext {
  poNumber: string;
  status: string; // OPEN | CLOSED | CANCELLED | CLOSED_FOR_RECEIVING
  closedForReceiving: boolean;
  totalAuthorizedAmount: number;
  remainingAmount: number;
  goodsReceiptLines: GrnLineContext[];
  lines?: PoLineContext[];
  isServicePo?: boolean;
  unitPriceTolerancePercent?: number; // e.g. default 0 or 2
  amountTolerancePercent?: number;
  cumulativeInvoicedAmount?: number;
}

export interface ThreeWayMatchResult {
  passed: boolean;
  exceptionType?:
    | "QUANTITY_DIFFERENCE"
    | "PRICE_DIFFERENCE"
    | "MISSING_PO"
    | "MANUAL_REVIEW"
    | "NONE";
  title?: string;
  reason?: string;
  netReceivedQuantity: number;
  totalReturnedQuantity: number;
}

export interface ThreeWayMatchOptions {
  priceTolerancePercent?: number;
  amountTolerancePercent?: number;
}

/**
 * Pure function evaluating 3-way matching rules per Tata Chemicals / Doc 04 standard & T-106:
 * 1. PO Status check (CLOSED / CANCELLED blocked with MANUAL_REVIEW)
 * 2. Cumulative / remaining amount over PO for both open and closed POs (PRICE_DIFFERENCE)
 * 3. Net accepted GRN quantity calculation with negative return quantities & zero receipt check (QUANTITY_DIFFERENCE)
 * 4. Per-line unit price tolerance check (PRICE_DIFFERENCE)
 * 5. Service PO exemption for physical GRN checks
 */
export function evaluateThreeWayMatch(
  po: PurchaseOrderMatchContext,
  invoicedQuantity: number,
  invoicedAmount: number,
  invoiceLines?: InvoiceLineMatchContext[],
  options?: ThreeWayMatchOptions
): ThreeWayMatchResult {
  // Rule 1: PO Status check — Block invoices against CLOSED or CANCELLED POs
  const normalizedStatus = po.status?.toUpperCase();
  if (normalizedStatus === "CLOSED" || normalizedStatus === "CANCELLED") {
    return {
      passed: false,
      exceptionType: "MANUAL_REVIEW",
      title: `Purchase Order ${normalizedStatus === "CLOSED" ? "Closed" : "Cancelled"}`,
      reason: `PO ${po.poNumber} has status ${po.status}. Invoices cannot be processed against closed or cancelled purchase orders.`,
      netReceivedQuantity: 0,
      totalReturnedQuantity: 0,
    };
  }

  // Calculate net received quantity with negative return quantities
  let netReceived = 0;
  let totalReturned = 0;

  for (const line of po.goodsReceiptLines) {
    if (line.receivedQuantity < 0) {
      totalReturned += Math.abs(line.receivedQuantity);
    }
    netReceived += line.receivedQuantity;
  }

  // Rule 2: Cumulative amount over PO for both Open and Closed POs
  const amountTolerance = options?.amountTolerancePercent ?? po.amountTolerancePercent ?? 0;
  const maxAllowableRemaining = po.remainingAmount * (1 + amountTolerance / 100);
  const maxAllowableTotal = po.totalAuthorizedAmount * (1 + amountTolerance / 100);

  if (po.closedForReceiving || normalizedStatus === "CLOSED_FOR_RECEIVING") {
    if (invoicedAmount > po.remainingAmount) {
      return {
        passed: false,
        exceptionType: "PRICE_DIFFERENCE",
        title: "PO Closed for Receiving — Liability Cap Exceeded",
        netReceivedQuantity: netReceived,
        totalReturnedQuantity: totalReturned,
        reason: `PO ${po.poNumber} is Closed for Receiving. Billed amount (${invoicedAmount}) exceeds remaining balance (${po.remainingAmount}).`,
      };
    }
  } else {
    // Open POs: fail cumulative amount over PO total, or single invoice over remaining amount
    if (po.cumulativeInvoicedAmount !== undefined && po.cumulativeInvoicedAmount > maxAllowableTotal) {
      return {
        passed: false,
        exceptionType: "PRICE_DIFFERENCE",
        title: "Purchase Order Liability Cap Exceeded",
        netReceivedQuantity: netReceived,
        totalReturnedQuantity: totalReturned,
        reason: `Cumulative billed amount (${po.cumulativeInvoicedAmount}) exceeds PO ${po.poNumber} total authorized amount (${po.totalAuthorizedAmount}).`,
      };
    }

    if (invoicedAmount > maxAllowableRemaining) {
      return {
        passed: false,
        exceptionType: "PRICE_DIFFERENCE",
        title: "Purchase Order Liability Cap Exceeded",
        netReceivedQuantity: netReceived,
        totalReturnedQuantity: totalReturned,
        reason: `Billed amount (${invoicedAmount}) exceeds PO ${po.poNumber} remaining balance (${po.remainingAmount}). Total authorized: ${po.totalAuthorizedAmount}.`,
      };
    }
  }

  // Rule 3: Goods Receipt (GRN) quantity check
  // Service-type POs that legitimately have no GRN are handled by an explicit PO flag
  if (!po.isServicePo) {
    // If no GRN exists at all and invoicedQuantity > 0
    if (po.goodsReceiptLines.length === 0 && invoicedQuantity > 0) {
      return {
        passed: false,
        exceptionType: "QUANTITY_DIFFERENCE",
        title: "3-Way Match Failed: No Goods Receipt Recorded",
        netReceivedQuantity: 0,
        totalReturnedQuantity: 0,
        reason: `Invoice bills for ${invoicedQuantity} units, but no Goods Receipt (GRN) has been recorded (net received: 0).`,
      };
    }

    // If GRN exists, but returns net to zero or negative
    if (po.goodsReceiptLines.length > 0 && invoicedQuantity > 0 && netReceived <= 0) {
      return {
        passed: false,
        exceptionType: "QUANTITY_DIFFERENCE",
        title: "3-Way Match Failed: Goods Return / Rejection Detected on GRN",
        netReceivedQuantity: netReceived,
        totalReturnedQuantity: totalReturned,
        reason: `Invoice bills for ${invoicedQuantity} units, but Net Accepted GRN is ${netReceived} units (${totalReturned} units returned during Quality Inspection).`,
      };
    }

    // If partial receipt or invoiced quantity exceeds net received
    if (invoicedQuantity > netReceived && netReceived > 0) {
      return {
        passed: false,
        exceptionType: "QUANTITY_DIFFERENCE",
        title: "3-Way Match Failed: Goods Return / Rejection Detected on GRN",
        netReceivedQuantity: netReceived,
        totalReturnedQuantity: totalReturned,
        reason: `Invoice bills for ${invoicedQuantity} units, but Net Accepted GRN is ${netReceived} units (${totalReturned} units returned during Quality Inspection).`,
      };
    }
  }

  // Rule 4: Per-line unit price tolerance check
  const priceTolerance = options?.priceTolerancePercent ?? po.unitPriceTolerancePercent ?? 0;
  if (invoiceLines && invoiceLines.length > 0 && po.lines && po.lines.length > 0) {
    for (const invLine of invoiceLines) {
      const poLine =
        po.lines.find((p) => p.lineNumber === invLine.lineNumber) ||
        po.lines.find(
          (p) =>
            p.description &&
            invLine.description &&
            p.description.trim().toLowerCase() === invLine.description.trim().toLowerCase()
        );

      if (poLine && poLine.unitPrice > 0) {
        const allowedUnitPrice = poLine.unitPrice * (1 + priceTolerance / 100);
        // Compare with small floating point epsilon
        if (invLine.unitPrice - allowedUnitPrice > 0.0001) {
          return {
            passed: false,
            exceptionType: "PRICE_DIFFERENCE",
            title: "3-Way Match Failed: Line Unit Price Tolerance Exceeded",
            netReceivedQuantity: netReceived,
            totalReturnedQuantity: totalReturned,
            reason: `Line ${invLine.lineNumber}: Invoiced unit price (${invLine.unitPrice}) exceeds PO unit price (${poLine.unitPrice}) by more than allowed tolerance (${priceTolerance}%).`,
          };
        }
      }
    }
  }

  return {
    passed: true,
    exceptionType: "NONE",
    netReceivedQuantity: netReceived,
    totalReturnedQuantity: totalReturned,
  };
}

/**
 * Executes 3-way match in workflow context and records state transitions / exceptions.
 */
export async function runThreeWayMatching(params: {
  organizationId: string;
  invoiceId: string;
  userId?: string;
  options?: ThreeWayMatchOptions;
}): Promise<ThreeWayMatchResult> {
  const { organizationId, invoiceId, userId, options } = params;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: {
      lines: true,
    },
  });

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found in org ${organizationId}`);
  }

  await applyTransition({ invoiceId, organizationId, event: "MATCHING_START", triggeredBy: userId });

  // If Non-PO invoice, passes matching by design
  if (!invoice.purchaseOrderId) {
    await applyTransition({ invoiceId, organizationId, event: "MATCHING_SUCCESS", triggeredBy: userId });
    return {
      passed: true,
      exceptionType: "NONE",
      netReceivedQuantity: 0,
      totalReturnedQuantity: 0,
    };
  }

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: invoice.purchaseOrderId, organizationId },
    include: {
      goodsReceipts: {
        include: { lines: true },
      },
    },
  });

  if (!po) {
    // Missing PO exception
    await applyTransition({ invoiceId, organizationId, event: "MATCHING_FAILURE", triggeredBy: userId });
    await prisma.exception.create({
      data: {
        organizationId,
        invoiceId,
        type: "MISSING_PO",
        severity: "HIGH",
        title: "Purchase Order Not Found",
        description: `Associated purchase order ID ${invoice.purchaseOrderId} could not be located.`,
        status: "OPEN",
      },
    });
    return {
      passed: false,
      exceptionType: "MISSING_PO",
      title: "Purchase Order Not Found",
      reason: `PO not found for ID ${invoice.purchaseOrderId}`,
      netReceivedQuantity: 0,
      totalReturnedQuantity: 0,
    };
  }

  const grnLines: GrnLineContext[] = po.goodsReceipts.flatMap((grn) =>
    grn.lines.map((l) => ({
      lineNumber: l.lineNumber,
      description: l.description,
      receivedQuantity: Number(l.receivedQuantity),
      status: l.status,
      inspectionNotes: l.inspectionNotes,
    }))
  );

  const poContext: PurchaseOrderMatchContext = {
    poNumber: po.poNumber,
    status: po.status,
    closedForReceiving: po.closedForReceiving,
    totalAuthorizedAmount: Number(po.totalAmount),
    remainingAmount: Number(po.remainingAmount),
    goodsReceiptLines: grnLines,
    isServicePo: (po as unknown as { isServicePo?: boolean }).isServicePo ?? false,
  };

  const invoiceLines: InvoiceLineMatchContext[] = invoice.lines.map((l) => ({
    lineNumber: l.lineNumber,
    description: l.description,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unitPrice),
    lineAmount: Number(l.lineAmount),
  }));

  const invoicedQuantity = invoice.lines.reduce((acc, l) => acc + Number(l.quantity), 0);
  const invoicedAmount = Number(invoice.totalAmount);

  const result = evaluateThreeWayMatch(poContext, invoicedQuantity, invoicedAmount, invoiceLines, options);

  if (!result.passed) {
    await applyTransition({ invoiceId, organizationId, event: "MATCHING_FAILURE", triggeredBy: userId });
    const exType =
      result.exceptionType && result.exceptionType !== "NONE"
        ? (result.exceptionType as "QUANTITY_DIFFERENCE" | "PRICE_DIFFERENCE" | "MISSING_PO" | "MANUAL_REVIEW")
        : "PRICE_DIFFERENCE";
    await prisma.exception.create({
      data: {
        organizationId,
        invoiceId,
        type: exType,
        severity: "HIGH",
        title: result.title ?? "3-Way Match Verification Failed",
        description: result.reason ?? "Discrepancy detected during 3-way matching",
        status: "OPEN",
      },
    });
    return result;
  }

  await applyTransition({ invoiceId, organizationId, event: "MATCHING_SUCCESS", triggeredBy: userId });
  return result;
}
