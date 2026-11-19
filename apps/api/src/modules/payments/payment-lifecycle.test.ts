import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "../../config/database";
import * as paymentService from "./service";
import * as workflowEngine from "../../workflow/engine";
import { ApiError } from "../../lib/errors";

describe("Payment Service T-101 & T-102 Lifecycle and Settlement Tests", () => {
  const orgId = "org-payment-test";
  const userId = "user-finance-mgr";
  const invoiceId = "inv-test-101";
  const paymentId = "pay-test-101";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("T-101: Payments reaching PAID with settlementDate and utrNumber", () => {
    it("successfully settles payment and passes utrNumber and settlementDate to applyTransition", async () => {
      const mockPayment = {
        id: paymentId,
        organizationId: orgId,
        invoiceId,
        amount: 50000,
        currency: "INR",
        status: "SCHEDULED",
        paymentMethod: "BANK_TRANSFER",
        invoice: {
          id: invoiceId,
          supplierId: "sup-1",
          supplier: { displayName: "Acme Corp" },
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: paymentId, status: "SCHEDULED" }]),
          payment: {
            findFirst: vi.fn().mockResolvedValue(mockPayment),
            update: vi.fn().mockImplementation(({ data }: any) => {
              return { ...mockPayment, ...data };
            }),
          },
          invoice: {
            update: vi.fn().mockResolvedValue({ id: invoiceId, status: "PAID" }),
          },
          auditLog: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "audit-1" }),
          },
        };
        return cb(tx);
      });

      const applyTransitionSpy = vi.spyOn(workflowEngine, "applyTransition").mockResolvedValue({} as any);

      const targetSettlementDate = new Date("2026-11-20T10:00:00.000Z");
      const result = await paymentService.executePayment(orgId, paymentId, userId, {
        utrNumber: "NEFT20261120001",
        settlementDate: targetSettlementDate,
        clearingDocumentNumber: "CLR-9988",
      });

      expect(result.status).toBe("PAID");
      expect(result.utrNumber).toBe("NEFT20261120001");
      expect(result.settlementDate).toEqual(targetSettlementDate);

      // Verify applyTransition was called with PAYMENT_SUCCESS and both utrNumber & settlementDate
      expect(applyTransitionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceId,
          organizationId: orgId,
          event: "PAYMENT_SUCCESS",
          utrNumber: "NEFT20261120001",
          settlementDate: targetSettlementDate,
        })
      );
    });

    it("rejects settlement when UTR number is missing (HTTP 400)", async () => {
      const mockPayment = {
        id: paymentId,
        organizationId: orgId,
        invoiceId,
        amount: 50000,
        currency: "INR",
        status: "SCHEDULED",
        paymentMethod: "BANK_TRANSFER",
        invoice: {
          id: invoiceId,
          supplierId: "sup-1",
          supplier: { displayName: "Acme Corp" },
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: paymentId, status: "SCHEDULED" }]),
          payment: {
            findFirst: vi.fn().mockResolvedValue(mockPayment),
            update: vi.fn().mockResolvedValue(mockPayment),
          },
          auditLog: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        };
        return cb(tx);
      });

      vi.spyOn(prisma.payment, "update").mockResolvedValue(mockPayment as any);

      vi.spyOn(workflowEngine, "applyTransition").mockResolvedValue({} as any);

      await expect(
        paymentService.executePayment(orgId, paymentId, userId, {
          utrNumber: "   ", // whitespace only
        })
      ).rejects.toThrow("Bank UTR or transaction reference number is required to confirm manual disbursement.");
    });
  });

  describe("T-102: Payment lifecycle consistency, deduplication, and retries", () => {
    it("updates scheduledDate on schedulePayment if payment is already SCHEDULED instead of duplicate create", async () => {
      const existingPayment = {
        id: paymentId,
        organizationId: orgId,
        invoiceId,
        amount: 25000,
        currency: "INR",
        scheduledDate: new Date("2026-11-25"),
        status: "SCHEDULED",
        paymentMethod: "BANK_TRANSFER",
      };

      const updatedDate = "2026-11-30";

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: invoiceId }]),
          invoice: {
            findFirst: vi.fn().mockResolvedValue({
              id: invoiceId,
              organizationId: orgId,
              status: "SCHEDULED",
              workflowState: "SCHEDULED",
              currency: "INR",
            }),
          },
          payment: {
            findFirst: vi.fn().mockResolvedValue(existingPayment),
            update: vi.fn().mockImplementation(({ data }: any) => ({
              ...existingPayment,
              ...data,
            })),
            create: vi.fn(),
          },
        };
        return cb(tx);
      });

      const res = await paymentService.schedulePayment(orgId, {
        invoiceId,
        amount: 25000,
        scheduledDate: updatedDate,
      });

      expect(res.id).toBe(paymentId);
      expect(new Date(res.scheduledDate).toISOString()).toBe(new Date(updatedDate).toISOString());
    });

    it("returns 409 Conflict if active payment is in PROCESSING state", async () => {
      const processingPayment = {
        id: paymentId,
        organizationId: orgId,
        invoiceId,
        amount: 25000,
        currency: "INR",
        status: "PROCESSING",
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: invoiceId }]),
          invoice: {
            findFirst: vi.fn().mockResolvedValue({
              id: invoiceId,
              organizationId: orgId,
              status: "SCHEDULED",
              workflowState: "SCHEDULED",
              currency: "INR",
            }),
          },
          payment: {
            findFirst: vi.fn().mockResolvedValue(processingPayment),
          },
        };
        return cb(tx);
      });

      await expect(
        paymentService.schedulePayment(orgId, {
          invoiceId,
          amount: 25000,
          scheduledDate: "2026-12-01",
        })
      ).rejects.toThrow(ApiError);
    });

    it("allows retrying a FAILED payment to SCHEDULED state with an audit log", async () => {
      const failedPayment = {
        id: paymentId,
        organizationId: orgId,
        invoiceId,
        status: "FAILED",
        failureReason: "Gateway timeout",
      };

      let auditCreated: any = null;
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const tx = {
          payment: {
            findFirst: vi.fn().mockResolvedValue(failedPayment),
            update: vi.fn().mockImplementation(({ data }: any) => ({
              ...failedPayment,
              ...data,
            })),
          },
          auditLog: {
            create: vi.fn().mockImplementation(({ data }: any) => {
              auditCreated = data;
              return { id: "audit-retried", ...data };
            }),
          },
        };
        return cb(tx);
      });

      const result = await paymentService.retryPayment(orgId, paymentId, userId);

      expect(result.status).toBe("SCHEDULED");
      expect(result.failureReason).toBeNull();
      expect(auditCreated).toBeDefined();
      expect(auditCreated.action).toBe("PAYMENT_RETRY_SCHEDULED");
      expect(auditCreated.entityId).toBe(paymentId);
    });

    it("allows direct execution of a FAILED payment without error", async () => {
      const failedPayment = {
        id: paymentId,
        organizationId: orgId,
        invoiceId,
        amount: 50000,
        currency: "INR",
        status: "FAILED",
        failureReason: "Prior attempt timed out",
        paymentMethod: "BANK_TRANSFER",
        invoice: {
          id: invoiceId,
          supplierId: "sup-1",
          supplier: { displayName: "Acme Corp" },
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: paymentId, status: "FAILED" }]),
          payment: {
            findFirst: vi.fn().mockResolvedValue(failedPayment),
            update: vi.fn().mockImplementation(({ data }: any) => {
              return { ...failedPayment, ...data };
            }),
          },
          invoice: {
            update: vi.fn().mockResolvedValue({ id: invoiceId, status: "PAID" }),
          },
          auditLog: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        };
        return cb(tx);
      });

      vi.spyOn(workflowEngine, "applyTransition").mockResolvedValue({} as any);

      const result = await paymentService.executePayment(orgId, paymentId, userId, {
        utrNumber: "RETRYUTR12345",
      });

      expect(result.status).toBe("PAID");
      expect(result.utrNumber).toBe("RETRYUTR12345");
    });
  });
});
