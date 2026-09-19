import { describe, expect, it, vi } from "vitest";
import { runBatchPayments } from "./batch-runner";
import { prisma } from "../../config/database";
import * as paymentService from "./service";

describe("Payment Batch Runner (Step 6)", () => {
  it("processes scheduled payments and returns batch summary", async () => {
    const mockPayments = [
      {
        id: "pay-1",
        invoiceId: "inv-1",
        organizationId: "org-1",
        amount: 25000 as any,
        status: "SCHEDULED",
        scheduledDate: new Date("2026-09-01"),
      },
      {
        id: "pay-2",
        invoiceId: "inv-2",
        organizationId: "org-1",
        amount: 50000 as any,
        status: "SCHEDULED",
        scheduledDate: new Date("2026-09-02"),
      },
    ];

    vi.spyOn(prisma.payment, "findMany").mockResolvedValue(mockPayments as any);

    const executeSpy = vi.spyOn(paymentService, "executePayment").mockResolvedValue({
      id: "pay-1",
      status: "PAID",
      utrNumber: "NEFT-123456",
    } as any);

    const result = await runBatchPayments({
      organizationId: "org-1",
      userId: "user-mgr-1",
    });

    expect(result.totalProcessed).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].status).toBe("SUCCESS");
    expect(result.items[0].utrNumber).toBe("NEFT-123456");
    expect(executeSpy).toHaveBeenCalledTimes(2);
  });

  it("handles partial failure without terminating the entire batch", async () => {
    const mockPayments = [
      {
        id: "pay-1",
        invoiceId: "inv-1",
        organizationId: "org-1",
        amount: 25000 as any,
        status: "SCHEDULED",
      },
      {
        id: "pay-2",
        invoiceId: "inv-2",
        organizationId: "org-1",
        amount: 50000 as any,
        status: "SCHEDULED",
      },
    ];

    vi.spyOn(prisma.payment, "findMany").mockResolvedValue(mockPayments as any);

    vi.spyOn(paymentService, "executePayment")
      .mockResolvedValueOnce({
        id: "pay-1",
        status: "PAID",
        utrNumber: "NEFT-SUCCESS",
      } as any)
      .mockRejectedValueOnce(new Error("Gateway connection timeout"));

    const result = await runBatchPayments({
      organizationId: "org-1",
      userId: "user-mgr-1",
    });

    expect(result.totalProcessed).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.items[0].status).toBe("SUCCESS");
    expect(result.items[1].status).toBe("FAILED");
    expect(result.items[1].error).toContain("Gateway connection timeout");
  });
});
