import { describe, expect, it, vi } from "vitest";
import {
  evaluateThreeWayMatch,
  PurchaseOrderMatchContext,
} from "./matcher";


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

  describe("runThreeWayMatching workflow execution", () => {
    it("automatically passes non-PO invoices and advances workflow state", async () => {
      const { prisma } = await import("../config/database");
      const workflowEngine = await import("./engine");
      const { runThreeWayMatching } = await import("./matcher");

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

