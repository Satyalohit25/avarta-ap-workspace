import { describe, expect, it, vi } from "vitest";
import {
  evaluateThreeWayMatch,
  PurchaseOrderMatchContext,
  InvoiceLineMatchContext,
} from "./three-way-matching";

describe("Tata Chemicals 3-Way Matching & GRN Quality Inspection Law (T-106)", () => {
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
      goodsReceiptLines: [
        { lineNumber: 1, description: "Industrial Salt", receivedQuantity: 10, status: "ACCEPTED" },
      ],
    };

    // Supplier sends invoice for 35k against a PO closed with 20k remaining
    const result = evaluateThreeWayMatch(mockPo, 10, 35000);

    expect(result.passed).toBe(false);
    expect(result.exceptionType).toBe("PRICE_DIFFERENCE");
    expect(result.reason).toContain("Closed for Receiving");
  });

  // T-106 Acceptance Criteria Tests

  it("fails invoice against a PO with zero goods receipts recorded with QUANTITY_DIFFERENCE", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-TATA-2025-004",
      status: "OPEN",
      closedForReceiving: false,
      totalAuthorizedAmount: 100000,
      remainingAmount: 100000,
      goodsReceiptLines: [], // No GRN recorded
    };

    const result = evaluateThreeWayMatch(mockPo, 50, 50000);

    expect(result.passed).toBe(false);
    expect(result.exceptionType).toBe("QUANTITY_DIFFERENCE");
    expect(result.netReceivedQuantity).toBe(0);
    expect(result.reason).toContain("no Goods Receipt (GRN) has been recorded");
  });

  it("fails invoice when GRN returns net to zero with QUANTITY_DIFFERENCE", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-TATA-2025-005",
      status: "OPEN",
      closedForReceiving: false,
      totalAuthorizedAmount: 100000,
      remainingAmount: 100000,
      goodsReceiptLines: [
        { lineNumber: 1, description: "Raw Material", receivedQuantity: 20, status: "ACCEPTED" },
        { lineNumber: 2, description: "Raw Material Damaged Return", receivedQuantity: -20, status: "RETURNED" },
      ],
    };

    // Net received is 0 (all 20 units returned)
    const result = evaluateThreeWayMatch(mockPo, 20, 20000);

    expect(result.passed).toBe(false);
    expect(result.exceptionType).toBe("QUANTITY_DIFFERENCE");
    expect(result.netReceivedQuantity).toBe(0);
    expect(result.totalReturnedQuantity).toBe(20);
    expect(result.reason).toContain("Net Accepted GRN is 0 units");
  });

  it("fails invoice when billed quantity exceeds partial GRN receipt with QUANTITY_DIFFERENCE", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-TATA-2025-006",
      status: "OPEN",
      closedForReceiving: false,
      totalAuthorizedAmount: 100000,
      remainingAmount: 100000,
      goodsReceiptLines: [
        { lineNumber: 1, description: "Components", receivedQuantity: 30, status: "ACCEPTED" },
      ],
    };

    // Invoiced 50, but GRN is only 30
    const result = evaluateThreeWayMatch(mockPo, 50, 50000);

    expect(result.passed).toBe(false);
    expect(result.exceptionType).toBe("QUANTITY_DIFFERENCE");
    expect(result.netReceivedQuantity).toBe(30);
  });

  it("passes service-type PO with explicit isServicePo flag even without GRN", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-SERV-2025-001",
      status: "OPEN",
      closedForReceiving: false,
      totalAuthorizedAmount: 50000,
      remainingAmount: 50000,
      goodsReceiptLines: [], // Service has no physical GRN
      isServicePo: true,
    };

    const result = evaluateThreeWayMatch(mockPo, 1, 50000);

    expect(result.passed).toBe(true);
    expect(result.exceptionType).toBe("NONE");
  });

  it("fails open PO when invoiced amount exceeds remaining authorized amount", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-OPEN-2025-001",
      status: "OPEN",
      closedForReceiving: false,
      totalAuthorizedAmount: 100000,
      remainingAmount: 40000, // Only 40k left
      goodsReceiptLines: [
        { lineNumber: 1, description: "Goods", receivedQuantity: 50, status: "ACCEPTED" },
      ],
    };

    // Billed amount 60,000 exceeds remaining balance 40,000
    const result = evaluateThreeWayMatch(mockPo, 50, 60000);

    expect(result.passed).toBe(false);
    expect(result.exceptionType).toBe("PRICE_DIFFERENCE");
    expect(result.title).toContain("Liability Cap Exceeded");
    expect(result.reason).toContain("exceeds PO PO-OPEN-2025-001 remaining balance (40000)");
  });

  it("fails open PO when cumulative invoiced amount exceeds PO total plus tolerance", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-OPEN-2025-002",
      status: "OPEN",
      closedForReceiving: false,
      totalAuthorizedAmount: 100000,
      remainingAmount: 100000,
      cumulativeInvoicedAmount: 105000, // Cumulative across invoices exceeds 100k
      amountTolerancePercent: 2, // 2% tolerance allowed -> max 102,000
      goodsReceiptLines: [
        { lineNumber: 1, description: "Goods", receivedQuantity: 100, status: "ACCEPTED" },
      ],
    };

    const result = evaluateThreeWayMatch(mockPo, 100, 25000);

    expect(result.passed).toBe(false);
    expect(result.exceptionType).toBe("PRICE_DIFFERENCE");
    expect(result.reason).toContain("Cumulative billed amount (105000) exceeds PO PO-OPEN-2025-002 total authorized amount (100000)");
  });

  it("fails invoice against a PO with status CLOSED with MANUAL_REVIEW exception", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-CLOSED-001",
      status: "CLOSED",
      closedForReceiving: true,
      totalAuthorizedAmount: 50000,
      remainingAmount: 0,
      goodsReceiptLines: [],
    };

    const result = evaluateThreeWayMatch(mockPo, 10, 10000);

    expect(result.passed).toBe(false);
    expect(result.exceptionType).toBe("MANUAL_REVIEW");
    expect(result.title).toContain("Closed");
    expect(result.reason).toContain("Invoices cannot be processed against closed or cancelled purchase orders");
  });

  it("fails invoice against a PO with status CANCELLED with MANUAL_REVIEW exception", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-CANCEL-001",
      status: "CANCELLED",
      closedForReceiving: false,
      totalAuthorizedAmount: 50000,
      remainingAmount: 50000,
      goodsReceiptLines: [],
    };

    const result = evaluateThreeWayMatch(mockPo, 10, 10000);

    expect(result.passed).toBe(false);
    expect(result.exceptionType).toBe("MANUAL_REVIEW");
    expect(result.title).toContain("Cancelled");
  });

  it("enforces line unit price tolerance: flags PRICE_DIFFERENCE when line price exceeds tolerance", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-LINE-001",
      status: "OPEN",
      closedForReceiving: false,
      totalAuthorizedAmount: 100000,
      remainingAmount: 100000,
      unitPriceTolerancePercent: 2, // 2% tolerance
      goodsReceiptLines: [
        { lineNumber: 1, description: "Widgets", receivedQuantity: 100, status: "ACCEPTED" },
      ],
      lines: [
        { lineNumber: 1, description: "Widgets", unitPrice: 100, quantity: 100 },
      ],
    };

    const invoiceLines: InvoiceLineMatchContext[] = [
      // 100 units at 105 per unit = 5% increase (> 2% tolerance)
      { lineNumber: 1, description: "Widgets", quantity: 100, unitPrice: 105, lineAmount: 10500 },
    ];

    const result = evaluateThreeWayMatch(mockPo, 100, 10500, invoiceLines);

    expect(result.passed).toBe(false);
    expect(result.exceptionType).toBe("PRICE_DIFFERENCE");
    expect(result.title).toContain("Line Unit Price Tolerance Exceeded");
    expect(result.reason).toContain("Invoiced unit price (105) exceeds PO unit price (100) by more than allowed tolerance (2%)");
  });

  it("passes line unit price check when invoiced price is within configured tolerance", () => {
    const mockPo: PurchaseOrderMatchContext = {
      poNumber: "PO-LINE-002",
      status: "OPEN",
      closedForReceiving: false,
      totalAuthorizedAmount: 100000,
      remainingAmount: 100000,
      unitPriceTolerancePercent: 2, // 2% tolerance
      goodsReceiptLines: [
        { lineNumber: 1, description: "Widgets", receivedQuantity: 100, status: "ACCEPTED" },
      ],
      lines: [
        { lineNumber: 1, description: "Widgets", unitPrice: 100, quantity: 100 },
      ],
    };

    const invoiceLines: InvoiceLineMatchContext[] = [
      // 100 units at 101.5 per unit = 1.5% increase (within 2% tolerance)
      { lineNumber: 1, description: "Widgets", quantity: 100, unitPrice: 101.5, lineAmount: 10150 },
    ];

    const result = evaluateThreeWayMatch(mockPo, 100, 10150, invoiceLines);

    expect(result.passed).toBe(true);
    expect(result.exceptionType).toBe("NONE");
  });

  it("validates bank UTR number and clearing document presence for remittance intimation", () => {
    const paymentRemittance = {
      utrNumber: "NEFT-TATAPAY-8941029",
      settlementDate: "2026-09-02",
      clearingDocumentNumber: "2533000040",
      status: "PAID",
    };

    expect(paymentRemittance.utrNumber).toMatch(/^NEFT-/);
    expect(paymentRemittance.clearingDocumentNumber).toBe("2533000040");
    expect(paymentRemittance.status).toBe("PAID");
  });

  describe("runThreeWayMatching workflow execution", () => {
    it("automatically passes non-PO invoices and advances workflow state", async () => {
      const { prisma } = await import("../config/database");
      const workflowEngine = await import("./engine");
      const { runThreeWayMatching } = await import("./three-way-matching");

      vi.spyOn(prisma.invoice, "findFirst").mockResolvedValue({
        id: "inv-non-po",
        organizationId: "org-1",
        purchaseOrderId: null,
        lines: [],
        totalAmount: 5000 as any,
      } as any);

      const transitionSpy = vi.spyOn(workflowEngine, "applyTransition").mockResolvedValue({} as any);

      const result = await runThreeWayMatching({
        organizationId: "org-1",
        invoiceId: "inv-non-po",
      });

      expect(result.passed).toBe(true);
      expect(transitionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ invoiceId: "inv-non-po", event: "MATCHING_START" })
      );
      expect(transitionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ invoiceId: "inv-non-po", event: "MATCHING_SUCCESS" })
      );
    });
  });
});
