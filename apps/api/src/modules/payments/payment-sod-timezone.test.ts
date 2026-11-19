import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "../../config/database";
import { executePayment, calculateIndianFiscalYear } from "./service";
import { verifyBankAccount } from "../bank_accounts/service";
import * as engineModule from "../../workflow/engine";
import * as adapterModule from "./adapter";
import * as bankRepo from "../bank_accounts/repository";

vi.mock("../bank_accounts/repository", () => ({
  markVerified: vi.fn(),
}));

vi.mock("../../config/database", () => ({
  prisma: {
    $transaction: vi.fn(),
    payment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    bankAccount: {
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    invoice: {
      update: vi.fn(),
    },
  },
}));

vi.mock("../../workflow/engine", () => ({
  applyTransition: vi.fn(),
}));

vi.mock("./adapter", () => ({
  getPaymentGatewayAdapter: vi.fn(),
}));

vi.mock("../integrations/repository", () => ({
  IntegrationRepository: {
    findByType: vi.fn().mockResolvedValue([
      {
        id: "int-01",
        provider: "MANUAL_BANK_TRANSFER",
        status: "CONNECTED",
      },
    ]),
  },
}));

describe("Payment SoD and Timezone Consistency (T-203 & T-206)", () => {
  const orgId = "org-sod-tz-123";
  const supplierA = "supp-aaa-111";
  const supplierB = "supp-bbb-222";
  const bankAccountA = "bank-aaa-111";
  const userId = "user-finance-999";
  const paymentIdA = "pay-aaa-001";
  const paymentIdB = "pay-bbb-002";

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(adapterModule.getPaymentGatewayAdapter).mockReturnValue({
      initiatePayout: vi.fn().mockResolvedValue({
        success: true,
        referenceNumber: "GATEWAY-REF-OK",
      }),
    } as any);

    vi.mocked(engineModule.applyTransition).mockResolvedValue({
      currentState: "PAID",
      previousState: "PROCESSING_PAYMENT",
      invoiceId: "inv-001",
      transitionedAt: new Date(),
    });
  });

  describe("T-203: Scoped Bank-Edit Segregation of Duties (RULE-PERM-004)", () => {
    it("allows releasing payment to Supplier B when user edited Supplier A's bank details", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: paymentIdB, status: "SCHEDULED" }]),
        payment: {
          findFirst: vi.fn().mockResolvedValue({
            id: paymentIdB,
            organizationId: orgId,
            status: "SCHEDULED",
            amount: 25000,
            currency: "INR",
            invoiceId: "inv-bbb-01",
            invoice: {
              id: "inv-bbb-01",
              supplierId: supplierB,
              supplier: { displayName: "Supplier B Inc" },
            },
          }),
          update: vi.fn().mockResolvedValue({ id: paymentIdB, status: "PAID" }),
        },
        organization: {
          findUnique: vi.fn().mockResolvedValue({
            id: orgId,
            timezone: "Asia/Kolkata",
            settings: { bankEditSodWindowDays: 30 },
          }),
        },
        bankAccount: {
          findMany: vi.fn().mockResolvedValue([{ id: "bank-bbb-222" }]),
        },
        auditLog: {
          // When querying for Supplier B's entity IDs, no bank edit audit exists
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "audit-1" }),
        },
        invoice: {
          update: vi.fn().mockResolvedValue({ id: "inv-bbb-01" }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const result = await executePayment(orgId, paymentIdB, userId, {
        utrNumber: "UTR-SUPPLIER-B-99",
        settlementDate: "2026-11-18T10:00:00.000Z",
      });

      expect(result).toBeDefined();
      expect(mockTx.bankAccount.findMany).toHaveBeenCalledWith({
        where: { organizationId: orgId, supplierId: supplierB },
        select: { id: true },
      });
      expect(mockTx.auditLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            entityId: { in: [supplierB, "bank-bbb-222"] },
          }),
        })
      );
    });

    it("refuses releasing payment to Supplier A when user edited Supplier A's bank details within 30 days (403 Forbidden)", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: paymentIdA, status: "SCHEDULED" }]),
        payment: {
          findFirst: vi.fn().mockResolvedValue({
            id: paymentIdA,
            organizationId: orgId,
            status: "SCHEDULED",
            amount: 50000,
            currency: "INR",
            invoiceId: "inv-aaa-01",
            invoice: {
              id: "inv-aaa-01",
              supplierId: supplierA,
              supplier: { displayName: "Supplier A Ltd" },
            },
          }),
        },
        organization: {
          findUnique: vi.fn().mockResolvedValue({
            id: orgId,
            timezone: "Asia/Kolkata",
            settings: { bankEditSodWindowDays: 30 },
          }),
        },
        bankAccount: {
          findMany: vi.fn().mockResolvedValue([{ id: bankAccountA }]),
        },
        auditLog: {
          // A bank edit audit log for Supplier A exists
          findFirst: vi.fn().mockResolvedValue({
            id: "audit-bank-edit-aaa",
            action: "UPDATE_BANK_ACCOUNT",
            entityType: "BANK_ACCOUNT",
            entityId: bankAccountA,
            userId,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await expect(
        executePayment(orgId, paymentIdA, userId, {
          utrNumber: "UTR-SUPPLIER-A-11",
          settlementDate: "2026-11-18T10:00:00.000Z",
        })
      ).rejects.toThrow("Segregation of Duties (SoD) violation");
    });

    it("allows releasing payment if bank edit was older than the configured window (e.g. 35 days ago)", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: paymentIdA, status: "SCHEDULED" }]),
        payment: {
          findFirst: vi.fn().mockResolvedValue({
            id: paymentIdA,
            organizationId: orgId,
            status: "SCHEDULED",
            amount: 50000,
            currency: "INR",
            invoiceId: "inv-aaa-01",
            invoice: {
              id: "inv-aaa-01",
              supplierId: supplierA,
              supplier: { displayName: "Supplier A Ltd" },
            },
          }),
          update: vi.fn().mockResolvedValue({ id: paymentIdA, status: "PAID" }),
        },
        organization: {
          findUnique: vi.fn().mockResolvedValue({
            id: orgId,
            timezone: "Asia/Kolkata",
            settings: { bankEditSodWindowDays: 30 },
          }),
        },
        bankAccount: {
          findMany: vi.fn().mockResolvedValue([{ id: bankAccountA }]),
        },
        auditLog: {
          // Prisma query with gte: cutoffDate returns null because audit was 35 days ago
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "audit-2" }),
        },
        invoice: {
          update: vi.fn().mockResolvedValue({ id: "inv-aaa-01" }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const result = await executePayment(orgId, paymentIdA, userId, {
        utrNumber: "UTR-OLD-EDIT-OK",
        settlementDate: "2026-11-18T10:00:00.000Z",
      });

      expect(result).toBeDefined();
    });

    it("allows solo-admin override with >=10 char justification and records audit trail", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: paymentIdA, status: "SCHEDULED" }]),
        payment: {
          findFirst: vi.fn().mockResolvedValue({
            id: paymentIdA,
            organizationId: orgId,
            status: "SCHEDULED",
            amount: 50000,
            currency: "INR",
            invoiceId: "inv-aaa-01",
            invoice: {
              id: "inv-aaa-01",
              supplierId: supplierA,
              supplier: { displayName: "Supplier A Ltd" },
            },
          }),
          update: vi.fn().mockResolvedValue({ id: paymentIdA, status: "PAID" }),
        },
        organization: {
          findUnique: vi.fn().mockResolvedValue({
            id: orgId,
            timezone: "Asia/Kolkata",
            settings: { bankEditSodWindowDays: 30 },
          }),
        },
        bankAccount: {
          findMany: vi.fn().mockResolvedValue([{ id: bankAccountA }]),
        },
        auditLog: {
          findFirst: vi.fn().mockResolvedValue({
            id: "audit-bank-edit-aaa",
            action: "UPDATE_BANK_ACCOUNT",
            entityType: "BANK_ACCOUNT",
            entityId: bankAccountA,
            userId,
            createdAt: new Date(),
          }),
          create: vi.fn().mockResolvedValue({ id: "audit-sod-override" }),
        },
        user: {
          findFirst: vi.fn().mockResolvedValue({
            id: userId,
            role: "ADMINISTRATOR",
            status: "ACTIVE",
          }),
          count: vi.fn().mockResolvedValue(1), // Only 1 active administrator
        },
        invoice: {
          update: vi.fn().mockResolvedValue({ id: "inv-aaa-01" }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const result = await executePayment(orgId, paymentIdA, userId, {
        utrNumber: "UTR-SOLO-OVERRIDE-1",
        settlementDate: "2026-11-18T10:00:00.000Z",
        overrideSoloAdmin: true,
        overrideReason: "Sole proprietor administrator emergency vendor payout.",
      });

      expect(result).toBeDefined();
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "SOD_OVERRIDE_PAYMENT_RELEASE",
          entityType: "PAYMENT",
          entityId: paymentIdA,
          afterData: expect.objectContaining({
            sodOverridden: true,
            overrideReason: "Sole proprietor administrator emergency vendor payout.",
            activeAdminCount: 1,
            role: "ADMINISTRATOR",
          }),
        }),
      });
    });

    it("rejects solo-admin override when reason is under 10 characters", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: paymentIdA, status: "SCHEDULED" }]),
        payment: {
          findFirst: vi.fn().mockResolvedValue({
            id: paymentIdA,
            organizationId: orgId,
            status: "SCHEDULED",
            amount: 50000,
            currency: "INR",
            invoiceId: "inv-aaa-01",
            invoice: {
              id: "inv-aaa-01",
              supplierId: supplierA,
            },
          }),
        },
        organization: {
          findUnique: vi.fn().mockResolvedValue({
            id: orgId,
            settings: { bankEditSodWindowDays: 30 },
          }),
        },
        bankAccount: {
          findMany: vi.fn().mockResolvedValue([{ id: bankAccountA }]),
        },
        auditLog: {
          findFirst: vi.fn().mockResolvedValue({
            id: "audit-1",
            entityId: bankAccountA,
          }),
        },
        user: {
          findFirst: vi.fn().mockResolvedValue({
            id: userId,
            role: "ADMINISTRATOR",
          }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await expect(
        executePayment(orgId, paymentIdA, userId, {
          utrNumber: "UTR-FAIL",
          settlementDate: "2026-11-18",
          overrideSoloAdmin: true,
          overrideReason: "too short",
        })
      ).rejects.toThrow("at least 10 characters is required");
    });

    it("rejects solo-admin override when organization has multiple active administrators", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: paymentIdA, status: "SCHEDULED" }]),
        payment: {
          findFirst: vi.fn().mockResolvedValue({
            id: paymentIdA,
            organizationId: orgId,
            status: "SCHEDULED",
            amount: 50000,
            currency: "INR",
            invoiceId: "inv-aaa-01",
            invoice: {
              id: "inv-aaa-01",
              supplierId: supplierA,
            },
          }),
        },
        organization: {
          findUnique: vi.fn().mockResolvedValue({
            id: orgId,
            settings: { bankEditSodWindowDays: 30 },
          }),
        },
        bankAccount: {
          findMany: vi.fn().mockResolvedValue([{ id: bankAccountA }]),
        },
        auditLog: {
          findFirst: vi.fn().mockResolvedValue({
            id: "audit-1",
            entityId: bankAccountA,
          }),
        },
        user: {
          findFirst: vi.fn().mockResolvedValue({
            id: userId,
            role: "ADMINISTRATOR",
          }),
          count: vi.fn().mockResolvedValue(2), // 2 active admins
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await expect(
        executePayment(orgId, paymentIdA, userId, {
          utrNumber: "UTR-FAIL",
          settlementDate: "2026-11-18",
          overrideSoloAdmin: true,
          overrideReason: "Legitimate multi-admin override attempt.",
        })
      ).rejects.toThrow("only permitted for single-administrator organizations");
    });

    describe("2-Person Bank Verification Rule", () => {
      it("prevents bank account creator from verifying the account in a multi-admin organization", async () => {
        vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({
          id: "audit-creation",
          userId: "user-creator-1",
          entityType: "BANK_ACCOUNT",
          entityId: "bank-acc-1",
          action: "CREATE_BANK_ACCOUNT",
          organizationId: orgId,
          createdAt: new Date(),
        } as any);

        vi.mocked(prisma.user.count).mockResolvedValue(2); // Multi-admin organization

        await expect(
          verifyBankAccount(orgId, "bank-acc-1", "user-creator-1")
        ).rejects.toThrow("Segregation of Duties (SoD) violation: The user who created this bank account cannot verify it");
      });

      it("allows a second administrator to verify the bank account in a multi-admin organization", async () => {
        vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({
          id: "audit-creation",
          userId: "user-creator-1",
          entityType: "BANK_ACCOUNT",
          entityId: "bank-acc-1",
          action: "CREATE_BANK_ACCOUNT",
          organizationId: orgId,
          createdAt: new Date(),
        } as any);

        vi.mocked(bankRepo.markVerified).mockResolvedValue({
          id: "bank-acc-1",
          organizationId: orgId,
          status: "VERIFIED",
          bankName: "HDFC Bank",
          accountNumberLast4: "1234",
          supplierId: "supp-1",
          supplierName: "Supplier 1",
          isPrimary: true,
          ifscSwift: "HDFC0001234",
          accountType: "CURRENT",
          verifiedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          branchName: null,
          encryptedAccountNumber: "enc-123",
        } as any);

        const result = await verifyBankAccount(orgId, "bank-acc-1", "user-verifier-2");
        expect(result.status).toBe("VERIFIED");
        expect(prisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              action: "VERIFY_BANK_ACCOUNT",
              userId: "user-verifier-2",
            }),
          })
        );
      });
    });
  });

  describe("T-206: Timezone for Fiscal Year & Dates", () => {
    it("stamps correct fiscal year at 2027-03-31 20:00 UTC (FY2027-28 in Asia/Kolkata)", async () => {
      const date = new Date("2027-03-31T20:00:00.000Z");
      const fy = calculateIndianFiscalYear(date, "Asia/Kolkata");
      expect(fy).toBe("FY2027-28");
    });

    it("stamps correct fiscal year at 2027-03-31 17:00 UTC (FY2026-27 in Asia/Kolkata)", async () => {
      const date = new Date("2027-03-31T17:00:00.000Z");
      const fy = calculateIndianFiscalYear(date, "Asia/Kolkata");
      expect(fy).toBe("FY2026-27");
    });

    it("stamps invoice fiscalYear using organization's configured timezone", async () => {
      const settlementDate = new Date("2027-03-31T20:00:00.000Z");
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: paymentIdA, status: "SCHEDULED" }]),
        payment: {
          findFirst: vi.fn().mockResolvedValue({
            id: paymentIdA,
            organizationId: orgId,
            status: "SCHEDULED",
            amount: 50000,
            currency: "INR",
            invoiceId: "inv-aaa-01",
            invoice: {
              id: "inv-aaa-01",
              supplierId: supplierA,
              supplier: { displayName: "Supplier A" },
            },
          }),
          update: vi.fn().mockResolvedValue({ id: paymentIdA, status: "PAID" }),
        },
        organization: {
          findUnique: vi.fn().mockResolvedValue({
            id: orgId,
            timezone: "Asia/Kolkata",
          }),
        },
        bankAccount: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        auditLog: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        invoice: {
          update: vi.fn().mockResolvedValue({ id: "inv-aaa-01" }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await executePayment(orgId, paymentIdA, userId, {
        utrNumber: "UTR-TZ-TEST-01",
        settlementDate,
      });

      // Verify invoice was updated with fiscalYear "FY2027-28"
      expect(mockTx.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fiscalYear: "FY2027-28",
          }),
        })
      );
    });
  });
});
