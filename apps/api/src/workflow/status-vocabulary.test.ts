import { describe, it, expect } from "vitest";
import {
  WORKFLOW_STATES,
  STATE_TO_INVOICE_STATUS,
  ALL_INVOICE_STATUSES,
  REACHABLE_INVOICE_STATUSES,
  ALL_PAYMENT_STATUSES,
  ALL_PURCHASE_ORDER_STATUSES,
  INVOICE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PO_STATUS_LABELS,
  isPoClosedForReceiving,
} from "./status-vocabulary";
import { STATUS_LABEL, STATUS_VARIANT, STATUS_ICON } from "../../../web/src/components/StatusBadge";

describe("T-305: Unified Status Vocabulary & PO Status Invariants", () => {
  it("verifies all engine states project strictly to reachable resting invoice statuses", () => {
    for (const state of WORKFLOW_STATES) {
      const projected = STATE_TO_INVOICE_STATUS[state];
      expect(projected, `State ${state} must have a projection`).toBeDefined();
      expect(REACHABLE_INVOICE_STATUSES).toContain(projected);
    }
  });

  it("verifies APPROVED and REJECTED are transition events and NEVER resting projection states", () => {
    const projectedStatuses = Object.values(STATE_TO_INVOICE_STATUS);
    expect(projectedStatuses).not.toContain("APPROVED");
    expect(projectedStatuses).not.toContain("REJECTED");
    expect(REACHABLE_INVOICE_STATUSES).not.toContain("APPROVED");
    expect(REACHABLE_INVOICE_STATUSES).not.toContain("REJECTED");
  });

  it("verifies all reachable invoice statuses have defined human labels", () => {
    for (const status of REACHABLE_INVOICE_STATUSES) {
      expect(INVOICE_STATUS_LABELS[status], `Label for ${status}`).toBeDefined();
      expect(INVOICE_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });

  it("verifies all payment statuses have defined human labels", () => {
    for (const status of ALL_PAYMENT_STATUSES) {
      expect(PAYMENT_STATUS_LABELS[status], `Label for ${status}`).toBeDefined();
      expect(PAYMENT_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });

  it("verifies all purchase order statuses have defined human labels", () => {
    for (const status of ALL_PURCHASE_ORDER_STATUSES) {
      expect(PO_STATUS_LABELS[status], `Label for ${status}`).toBeDefined();
      expect(PO_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });

  it("verifies PurchaseOrder.status is single source of truth for closedForReceiving", () => {
    // Canonical status CLOSED_FOR_RECEIVING
    expect(isPoClosedForReceiving({ status: "CLOSED_FOR_RECEIVING" })).toBe(true);
    expect(isPoClosedForReceiving({ status: "closed_for_receiving" })).toBe(true);

    // Canonical status CLOSED
    expect(isPoClosedForReceiving({ status: "CLOSED" })).toBe(true);
    expect(isPoClosedForReceiving({ status: "closed" })).toBe(true);

    // OPEN with legacy boolean fallback
    expect(isPoClosedForReceiving({ status: "OPEN", closedForReceiving: true })).toBe(true);
    expect(isPoClosedForReceiving({ status: "OPEN", closedForReceiving: false })).toBe(false);
    expect(isPoClosedForReceiving({ status: "OPEN" })).toBe(false);

    // CANCELLED PO
    expect(isPoClosedForReceiving({ status: "CANCELLED", closedForReceiving: false })).toBe(false);
  });

  it("verifies StatusBadge contains complete mappings for CLOSED_FOR_RECEIVING and ON_HOLD", () => {
    expect(STATUS_VARIANT.CLOSED_FOR_RECEIVING).toBe("warning");
    expect(STATUS_LABEL.CLOSED_FOR_RECEIVING).toBe("Closed for Receiving");
    expect(STATUS_ICON.CLOSED_FOR_RECEIVING).toBeDefined();

    expect(STATUS_VARIANT.ON_HOLD).toBe("warning");
    expect(STATUS_LABEL.ON_HOLD).toBe("On Hold");
    expect(STATUS_ICON.ON_HOLD).toBeDefined();
  });

  it("asserts invoice filter tabs cover every reachable invoice status", () => {
    // Tabs configured in InvoicesPage
    const invoiceTabIds = [
      "",
      "RECEIVED",
      "PROCESSING",
      "EXCEPTION",
      "PENDING_APPROVAL",
      "SCHEDULED",
      "PAID",
      "SYNCED",
      "ARCHIVED",
    ];

    for (const status of REACHABLE_INVOICE_STATUSES) {
      expect(
        invoiceTabIds,
        `Reachable invoice status ${status} must have a dedicated filter tab in InvoicesPage`
      ).toContain(status);
    }
  });

  it("asserts payment filter tabs cover every reachable payment status", () => {
    // Tabs configured in PaymentsPage
    const paymentTabIds = [
      "ALL",
      "AWAITING_SCHEDULE",
      "SCHEDULED",
      "PROCESSING",
      "PAID",
      "FAILED",
      "ON_HOLD",
    ];

    for (const status of ALL_PAYMENT_STATUSES) {
      expect(
        paymentTabIds,
        `Reachable payment status ${status} must have a dedicated filter tab in PaymentsPage`
      ).toContain(status);
    }
  });
});
