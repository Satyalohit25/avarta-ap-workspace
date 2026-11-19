import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getTierForAmount,
  canRoleApproveAmount,
  getAllowedRolesForAmount,
  setCurrencyTiers,
  setStoredFxRate,
  resetThresholdsConfig,
  ApprovalTier,
} from "./thresholds";
import { approveApproval } from "./service";
import { prisma } from "../../config/database";
import * as workflowEngine from "../../workflow/engine";

describe("Approval Threshold Engine (Step 3)", () => {
  beforeEach(() => {
    resetThresholdsConfig();
  });

  describe("Tier calculation", () => {
    it("assigns amount <= 100,000 to Tier 1", () => {
      const tier = getTierForAmount(50_000);
      expect(tier.name).toContain("Tier 1");
      expect(tier.allowedRoles).toEqual(["APPROVER", "FINANCE_MANAGER", "ADMINISTRATOR"]);

      const tierBoundary = getTierForAmount(100_000);
      expect(tierBoundary.name).toContain("Tier 1");
    });

    it("assigns 100,000 < amount <= 500,000 to Tier 2", () => {
      const tier = getTierForAmount(150_000);
      expect(tier.name).toContain("Tier 2");
      expect(tier.allowedRoles).toEqual(["FINANCE_MANAGER", "ADMINISTRATOR"]);

      const tierBoundary = getTierForAmount(500_000);
      expect(tierBoundary.name).toContain("Tier 2");
    });

    it("assigns amount > 500,000 to Tier 3 (Admin only)", () => {
      const tier = getTierForAmount(500_001);
      expect(tier.name).toContain("Tier 3");
      expect(tier.allowedRoles).toEqual(["ADMINISTRATOR"]);

      const tierHigh = getTierForAmount(10_000_000);
      expect(tierHigh.name).toContain("Tier 3");
    });

    it("assigns USD amounts with zero gaps: <= $10k Tier 1, $10,001-$50k Tier 2, > $50k Tier 3", () => {
      expect(getTierForAmount(5_000, "USD").name).toContain("Tier 1");
      expect(getTierForAmount(10_000, "USD").name).toContain("Tier 1");
      expect(getTierForAmount(10_000.01, "USD").name).toContain("Tier 2");
      expect(getTierForAmount(10_001, "USD").name).toContain("Tier 2");
      expect(getTierForAmount(25_000, "USD").name).toContain("Tier 2");
      expect(getTierForAmount(50_000, "USD").name).toContain("Tier 2");
      expect(getTierForAmount(50_000.01, "USD").name).toContain("Tier 3");
      expect(getTierForAmount(50_001, "USD").name).toContain("Tier 3");
    });

    it("tests tier boundaries at the limit and one paisa/cent above for INR, USD, EUR, GBP", () => {
      // INR boundaries
      expect(getTierForAmount(100_000, "INR").name).toContain("Tier 1");
      expect(getTierForAmount(100_000.01, "INR").name).toContain("Tier 2");
      expect(getTierForAmount(500_000, "INR").name).toContain("Tier 2");
      expect(getTierForAmount(500_000.01, "INR").name).toContain("Tier 3");

      // USD boundaries
      expect(getTierForAmount(10_000, "USD").name).toContain("Tier 1");
      expect(getTierForAmount(10_000.01, "USD").name).toContain("Tier 2");
      expect(getTierForAmount(50_000, "USD").name).toContain("Tier 2");
      expect(getTierForAmount(50_000.01, "USD").name).toContain("Tier 3");

      // EUR boundaries
      expect(getTierForAmount(9_000, "EUR").name).toContain("Tier 1");
      expect(getTierForAmount(9_000.01, "EUR").name).toContain("Tier 2");
      expect(getTierForAmount(45_000, "EUR").name).toContain("Tier 2");
      expect(getTierForAmount(45_000.01, "EUR").name).toContain("Tier 3");

      // GBP boundaries
      expect(getTierForAmount(8_000, "GBP").name).toContain("Tier 1");
      expect(getTierForAmount(8_000.01, "GBP").name).toContain("Tier 2");
      expect(getTierForAmount(40_000, "GBP").name).toContain("Tier 2");
      expect(getTierForAmount(40_000.01, "GBP").name).toContain("Tier 3");
    });
  });

  describe("T-204: Multi-currency FX conversion and fail-closed security", () => {
    it("converts JPY amounts to USD base tiers accurately (resolving 10k JPY under-tiering)", () => {
      // 10,000 JPY is ~65 USD, which cleanly falls in Tier 1
      const tier10kJpy = getTierForAmount(10_000, "JPY");
      expect(tier10kJpy.allowedRoles).toEqual(["APPROVER", "FINANCE_MANAGER", "ADMINISTRATOR"]);
      expect(canRoleApproveAmount("APPROVER", 10_000, "JPY")).toBe(true);

      // High JPY amount: 10,000,000 JPY is ~65,000 USD -> Tier 3 (Admin only)
      const tier10mJpy = getTierForAmount(10_000_000, "JPY");
      expect(tier10mJpy.allowedRoles).toEqual(["ADMINISTRATOR"]);
      expect(canRoleApproveAmount("APPROVER", 10_000_000, "JPY")).toBe(false);
      expect(canRoleApproveAmount("FINANCE_MANAGER", 10_000_000, "JPY")).toBe(false);
      expect(canRoleApproveAmount("ADMINISTRATOR", 10_000_000, "JPY")).toBe(true);
    });

    it("converts KWD amounts to USD base tiers accurately (resolving 10k KWD over-delegation)", () => {
      // 10,000 KWD is ~32,500 USD, which requires elevated Tier 2 review (NOT basic Approver)
      const tier10kKwd = getTierForAmount(10_000, "KWD");
      expect(tier10kKwd.allowedRoles).toEqual(["FINANCE_MANAGER", "ADMINISTRATOR"]);
      expect(canRoleApproveAmount("APPROVER", 10_000, "KWD")).toBe(false);
      expect(canRoleApproveAmount("FINANCE_MANAGER", 10_000, "KWD")).toBe(true);

      // 20,000 KWD is ~65,000 USD -> Tier 3 (Admin only)
      expect(canRoleApproveAmount("FINANCE_MANAGER", 20_000, "KWD")).toBe(false);
      expect(canRoleApproveAmount("ADMINISTRATOR", 20_000, "KWD")).toBe(true);
    });

    it("fails closed when encountering an unconfigured currency and logs a warning", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const unconfiguredTier = getTierForAmount(50, "UNKNOWN_CURRENCY");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unconfigured currency "UNKNOWN_CURRENCY". Failing closed: strictly requiring ADMINISTRATOR')
      );
      expect(unconfiguredTier.allowedRoles).toEqual(["ADMINISTRATOR"]);

      // Unconfigured currency must fail closed: Approver and Finance Manager cannot approve
      expect(canRoleApproveAmount("APPROVER", 1, "XYZ")).toBe(false);
      expect(canRoleApproveAmount("FINANCE_MANAGER", 1, "XYZ")).toBe(false);
      expect(canRoleApproveAmount("ADMINISTRATOR", 1, "XYZ")).toBe(true);

      warnSpy.mockRestore();
    });

    it("supports dynamically configurable thresholds per currency", () => {
      const customSgdTiers: ApprovalTier[] = [
        {
          name: "Custom SGD Tier 1",
          minAmount: 0,
          maxAmount: 15_000,
          allowedRoles: ["APPROVER", "FINANCE_MANAGER", "ADMINISTRATOR"],
          currency: "SGD",
        },
        {
          name: "Custom SGD Tier 2",
          minAmount: 15_000.01,
          maxAmount: 75_000,
          allowedRoles: ["FINANCE_MANAGER", "ADMINISTRATOR"],
          currency: "SGD",
        },
        {
          name: "Custom SGD Tier 3",
          minAmount: 75_000.01,
          maxAmount: null,
          allowedRoles: ["ADMINISTRATOR"],
          currency: "SGD",
        },
      ];

      setCurrencyTiers("SGD", customSgdTiers);

      // Boundary tests for custom currency: at the limit and one paisa/cent above
      expect(getTierForAmount(15_000, "SGD").name).toBe("Custom SGD Tier 1");
      expect(getTierForAmount(15_000.01, "SGD").name).toBe("Custom SGD Tier 2");
      expect(getTierForAmount(75_000, "SGD").name).toBe("Custom SGD Tier 2");
      expect(getTierForAmount(75_000.01, "SGD").name).toBe("Custom SGD Tier 3");

      expect(canRoleApproveAmount("APPROVER", 15_000, "SGD")).toBe(true);
      expect(canRoleApproveAmount("APPROVER", 15_000.01, "SGD")).toBe(false);
    });

    it("supports dynamically configurable FX rates", () => {
      setStoredFxRate("CHF", 1.12);

      // 8,000 CHF * 1.12 = 8,960 USD <= 10,000 USD -> Tier 1
      expect(canRoleApproveAmount("APPROVER", 8_000, "CHF")).toBe(true);

      // 10,000 CHF * 1.12 = 11,200 USD > 10,000 USD -> Tier 2
      expect(canRoleApproveAmount("APPROVER", 10_000, "CHF")).toBe(false);
      expect(canRoleApproveAmount("FINANCE_MANAGER", 10_000, "CHF")).toBe(true);
    });
  });

  describe("canRoleApproveAmount", () => {
    it("allows Approver for Tier 1 amounts", () => {
      expect(canRoleApproveAmount("APPROVER", 50_000)).toBe(true);
      expect(canRoleApproveAmount("APPROVER", 100_000)).toBe(true);
    });

    it("denies Approver for Tier 2 and Tier 3 amounts", () => {
      expect(canRoleApproveAmount("APPROVER", 100_001)).toBe(false);
      expect(canRoleApproveAmount("APPROVER", 600_000)).toBe(false);
    });

    it("allows Finance Manager for Tier 1 and Tier 2, but denies for Tier 3", () => {
      expect(canRoleApproveAmount("FINANCE_MANAGER", 50_000)).toBe(true);
      expect(canRoleApproveAmount("FINANCE_MANAGER", 250_000)).toBe(true);
      expect(canRoleApproveAmount("FINANCE_MANAGER", 500_000)).toBe(true);
      expect(canRoleApproveAmount("FINANCE_MANAGER", 500_001)).toBe(false);
    });

    it("allows Administrator for all amounts", () => {
      expect(canRoleApproveAmount("ADMINISTRATOR", 10_000)).toBe(true);
      expect(canRoleApproveAmount("ADMINISTRATOR", 300_000)).toBe(true);
      expect(canRoleApproveAmount("ADMINISTRATOR", 50_000_000)).toBe(true);
    });

    it("denies Read Only and Finance Executive from approving", () => {
      expect(canRoleApproveAmount("READ_ONLY", 10_000)).toBe(false);
      expect(canRoleApproveAmount("FINANCE_EXECUTIVE", 10_000)).toBe(false);
    });
  });

  describe("Service enforcement", () => {
    it("throws 403 Forbidden when Approver tries to approve a Tier 2 invoice", async () => {
      vi.spyOn(prisma, "$queryRawUnsafe").mockResolvedValue([
        {
          id: "inv-1",
          organizationId: "org-1",
          workflowState: "WAITING_APPROVAL",
          invoiceNumber: "INV-1",
          totalAmount: 250_000,
          currency: "INR",
        },
      ] as any);

      vi.spyOn(prisma.approval, "findFirst").mockResolvedValue({
        id: "app-1",
        invoiceId: "inv-1",
        approverId: "user-1",
        status: "PENDING",
        requestedAt: new Date(),
        respondedAt: null,
        comment: null,
        invoice: {
          id: "inv-1",
          organizationId: "org-1",
          totalAmount: 250_000 as any,
        },
      } as any);

      await expect(
        approveApproval("org-1", "app-1", "user-1", "APPROVER", "Approved")
      ).rejects.toThrow(/Role "APPROVER" is not authorized to approve invoices of amount 250000/);
    });

    it("allows Finance Manager to approve a Tier 2 invoice", async () => {
      vi.spyOn(prisma, "$queryRawUnsafe").mockResolvedValue([
        {
          id: "inv-2",
          organizationId: "org-1",
          workflowState: "WAITING_APPROVAL",
          invoiceNumber: "INV-2",
          totalAmount: 250_000,
          currency: "INR",
        },
      ] as any);

      vi.spyOn(prisma.approval, "findFirst").mockResolvedValue({
        id: "app-2",
        invoiceId: "inv-2",
        approverId: "user-2",
        status: "PENDING",
        requestedAt: new Date(),
        respondedAt: null,
        comment: null,
        invoice: {
          id: "inv-2",
          organizationId: "org-1",
          totalAmount: 250_000 as any,
        },
      } as any);

      vi.spyOn(workflowEngine, "applyTransition").mockResolvedValue({
        invoice: {} as any,
        workflowInstance: {} as any,
      });

      vi.spyOn(prisma.approval, "findUnique").mockResolvedValue({
        id: "app-2",
        status: "APPROVED",
      } as any);

      const result = await approveApproval("org-1", "app-2", "user-2", "FINANCE_MANAGER", "Looks good");
      expect(result).toBeDefined();
      expect(workflowEngine.applyTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceId: "inv-2",
          event: "APPROVED",
        })
      );
    });
  });
});
