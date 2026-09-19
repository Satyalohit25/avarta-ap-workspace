import { describe, expect, it, vi } from "vitest";
import {
  getTierForAmount,
  canRoleApproveAmount,
} from "./thresholds";
import { approveApproval } from "./service";
import { prisma } from "../../config/database";
import * as workflowEngine from "../../workflow/engine";

describe("Approval Threshold Engine (Step 3)", () => {
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
