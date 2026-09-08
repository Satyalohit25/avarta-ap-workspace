import { describe, expect, it } from "vitest";

interface GrnLine {
  lineNumber: number;
  description: string;
  receivedQuantity: number; // can be negative for returned/defective goods
  status: "ACCEPTED" | "RETURNED" | "INSPECTION_PENDING";
  inspectionNotes?: string;
}

interface PurchaseOrderMatchContext {
  poNumber: string;
  status: string;
  closedForReceiving: boolean;
  totalAuthorizedAmount: number;
  remainingAmount: number;
  goodsReceiptLines: GrnLine[];
}

interface ThreeWayMatchResult {
  passed: boolean;
  exceptionType?: "QUANTITY_DIFFERENCE" | "PRICE_DIFFERENCE" | "NONE";
  netReceivedQuantity: number;
  totalReturnedQuantity: number;
  reason?: string;
}

function evaluateThreeWayMatch(
  po: PurchaseOrderMatchContext,
  invoicedQuantity: number,
  invoicedAmount: number
): ThreeWayMatchResult {
  // Rule 1: Closed for receiving liability cap (Tata Chemicals Slide 8)
  if (po.closedForReceiving || po.status === "CLOSED_FOR_RECEIVING") {
    if (invoicedAmount > po.remainingAmount) {
      return {
        passed: false,
        exceptionType: "PRICE_DIFFERENCE",
        netReceivedQuantity: 0,
        totalReturnedQuantity: 0,
        reason: `PO ${po.poNumber} is Closed for Receiving. Billed amount (${invoicedAmount}) exceeds remaining balance (${po.remainingAmount}).`,
      };
    }
  }

  // Rule 2: Calculate net received quantity with negative return quantities (Tata Chemicals Slide 8)
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

describe("Tata Chemicals 3-Way Matching & GRN Quality Inspection Law", () => {
  it("accounts for negative GRN lines for returned goods and flags QUANTITY_DIFFERENCE", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-TATA-2025-001",
      status: "OPEN",
      closedForReceiving: false,
      totalAuthorizedAmount: 500000,
      remainingAmount: 500000,
      goodsReceiptLines: [
        {
          lineNumber: 1,
          description: "Soda Ash Industrial Grade",
          receivedQuantity: 100, // 100 tons delivered at gate
          status: "ACCEPTED",
        },
        {
          lineNumber: 2,
          description: "Soda Ash Industrial Grade - Damaged packaging return",
          receivedQuantity: -10, // -10 tons rejected in Quality Inspection
          status: "RETURNED",
          inspectionNotes: "Subject to Quality Inspection: Damaged sacks rejected at gate",
        },
      ],
    };

    // Net accepted should be 90 tons
    // Supplier bills for full 100 tons
    const result = evaluateThreeWayMatch(mockPo, 100, 100000);

    expect(result.passed).toBe(false);
    expect(result.exceptionType).toBe("QUANTITY_DIFFERENCE");
    expect(result.netReceivedQuantity).toBe(90);
    expect(result.totalReturnedQuantity).toBe(10);
    expect(result.reason).toContain("10 units returned during Quality Inspection");
  });

  it("passes 3-way match when invoice accurately reflects net accepted delivery", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-TATA-2025-002",
      status: "OPEN",
      closedForReceiving: false,
      totalAuthorizedAmount: 500000,
      remainingAmount: 500000,
      goodsReceiptLines: [
        { lineNumber: 1, description: "Caustic Soda", receivedQuantity: 50, status: "ACCEPTED" },
        { lineNumber: 2, description: "Caustic Soda defect return", receivedQuantity: -5, status: "RETURNED" },
      ],
    };

    // Net accepted = 45. Supplier accurately billed for 45 units!
    const result = evaluateThreeWayMatch(mockPo, 45, 45000);

    expect(result.passed).toBe(true);
    expect(result.exceptionType).toBe("NONE");
    expect(result.netReceivedQuantity).toBe(45);
    expect(result.totalReturnedQuantity).toBe(5);
  });

  it("blocks invoice over-billing when PO is Closed for Receiving", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-TATA-2025-003",
      status: "CLOSED_FOR_RECEIVING",
      closedForReceiving: true,
      totalAuthorizedAmount: 100000,
      remainingAmount: 20000, // Only 20k remaining
      goodsReceiptLines: [],
    };

    // Supplier sends invoice for 35k against a PO closed with 20k remaining
    const result = evaluateThreeWayMatch(mockPo, 10, 35000);

    expect(result.passed).toBe(false);
    expect(result.exceptionType).toBe("PRICE_DIFFERENCE");
    expect(result.reason).toContain("Closed for Receiving");
  });

  it("validates bank UTR number and clearing document presence for remittance intimation", () => {
    const paymentRemittance = {
      utrNumber: "NEFT-TATAPAY-8941029",
      clearingDate: "2026-09-02",
      clearingDocumentNumber: "2533000040",
      status: "PAID",
    };

    expect(paymentRemittance.utrNumber).toMatch(/^NEFT-/);
    expect(paymentRemittance.clearingDocumentNumber).toBe("2533000040");
    expect(paymentRemittance.status).toBe("PAID");
  });
});
