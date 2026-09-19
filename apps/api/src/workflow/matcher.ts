import { prisma } from "../config/database";
import { applyTransition } from "./engine";

export interface GrnLineContext {
  lineNumber: number;
  description: string;
  receivedQuantity: number;
  status: "ACCEPTED" | "RETURNED" | "INSPECTION_PENDING" | string;
  inspectionNotes?: string | null;
}

export interface PurchaseOrderMatchContext {
  poNumber: string;
  status: string;
  closedForReceiving: boolean;
  totalAuthorizedAmount: number;
  remainingAmount: number;
  goodsReceiptLines: GrnLineContext[];
}

export interface ThreeWayMatchResult {
  passed: boolean;
  exceptionType?: "QUANTITY_DIFFERENCE" | "PRICE_DIFFERENCE" | "MISSING_PO" | "NONE";
  title?: string;
  reason?: string;
  netReceivedQuantity: number;
  totalReturnedQuantity: number;
}

/**
 * Pure function evaluating 3-way matching rules per Tata Chemicals / Doc 04 standard:
 * 1. Closed for receiving liability cap (Slide 8)
 * 2. Net accepted GRN quantity calculation with negative return quantities (Slide 8)
 */
export function evaluateThreeWayMatch(
  po: PurchaseOrderMatchContext,
  invoicedQuantity: number,
  invoicedAmount: number
): ThreeWayMatchResult {
  // Rule 1: Closed for receiving liability cap
  if (po.closedForReceiving || po.status === "CLOSED_FOR_RECEIVING") {
    if (invoicedAmount > po.remainingAmount) {
      return {
        passed: false,
        exceptionType: "PRICE_DIFFERENCE",
        title: "PO Closed for Receiving — Liability Cap Exceeded",
        netReceivedQuantity: 0,
        totalReturnedQuantity: 0,
        reason: `PO ${po.poNumber} is Closed for Receiving. Billed amount (${invoicedAmount}) exceeds remaining balance (${po.remainingAmount}).`,
      };
    }
  }

  // Rule 2: Calculate net received quantity with negative return quantities
  let netReceived = 0;
  let totalReturned = 0;

  for (const line of po.goodsReceiptLines) {
    if (line.receivedQuantity < 0) {
      totalReturned += Math.abs(line.receivedQuantity);
    }
    netReceived += line.receivedQuantity;
  }

  if (po.goodsReceiptLines.length > 0 && invoicedQuantity > netReceived && netReceived > 0) {
    return {
      passed: false,
      exceptionType: "QUANTITY_DIFFERENCE",
      title: "3-Way Match Failed: Goods Return / Rejection Detected on GRN",
      netReceivedQuantity: netReceived,
      totalReturnedQuantity: totalReturned,
      reason: `Invoice bills for ${invoicedQuantity} units, but Net Accepted GRN is ${netReceived} units (${totalReturned} units returned during Quality Inspection).`,
    };
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
}): Promise<ThreeWayMatchResult> {
  const { organizationId, invoiceId, userId } = params;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: {
      lines: true,
    },
  });

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found in org ${organizationId}`);
  }

  await applyTransition({ invoiceId, event: "MATCHING_START", triggeredBy: userId });

  // If Non-PO invoice, passes matching by design
  if (!invoice.purchaseOrderId) {
    await applyTransition({ invoiceId, event: "MATCHING_SUCCESS", triggeredBy: userId });
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
    await applyTransition({ invoiceId, event: "MATCHING_FAILURE", triggeredBy: userId });
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
  };

  const invoicedQuantity = invoice.lines.reduce((acc, l) => acc + Number(l.quantity), 0);
  const invoicedAmount = Number(invoice.totalAmount);

  const result = evaluateThreeWayMatch(poContext, invoicedQuantity, invoicedAmount);

  if (!result.passed) {
    await applyTransition({ invoiceId, event: "MATCHING_FAILURE", triggeredBy: userId });
    const exType =
      result.exceptionType && result.exceptionType !== "NONE"
        ? result.exceptionType
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

  await applyTransition({ invoiceId, event: "MATCHING_SUCCESS", triggeredBy: userId });
  return result;
}
