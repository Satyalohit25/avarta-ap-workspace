import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "../../config/database";
import { transitionInvoice } from "../invoices/service";
import { approveApproval } from "./service";
import { Role } from "../../middleware/permissions";
import { DEFAULT_INR_TIERS } from "./thresholds";

describe("Unified Approval Authority & Solo-Admin Override Matrix (Day 1.5 Items 2 & 3)", () => {
  const orgId = "org-unification-matrix";
  let creatorAdminId: string;
  let secondAdminId: string;
  let approverUserId: string;
  let financeManagerId: string;
  let readOnlyUserId: string;

  beforeEach(async () => {
    await prisma.workflowTransition.deleteMany({
      where: { workflowInstance: { invoice: { organizationId: orgId } } },
    });
    await prisma.workflowInstance.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.approval.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.exception.deleteMany({ where: { organizationId: orgId } });
    await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
    await prisma.invoiceLine.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.payment.deleteMany({ where: { organizationId: orgId } });
    await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });

    await prisma.organization.create({
      data: {
        id: orgId,
        name: "Unification Matrix Test Org",
        defaultCurrency: "INR",
        country: "IN",
      },
    });

    const creatorAdmin = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "solo-admin@matrix.test",
        passwordHash: "dummy",
        role: "ADMINISTRATOR",
        fullName: "Solo Admin",
        status: "ACTIVE",
      },
    });
    creatorAdminId = creatorAdmin.id;

    const secondAdmin = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "second-admin@matrix.test",
        passwordHash: "dummy",
        role: "ADMINISTRATOR",
        fullName: "Second Admin",
        status: "ACTIVE",
      },
    });
    secondAdminId = secondAdmin.id;

    const approverUser = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "approver@matrix.test",
        passwordHash: "dummy",
        role: "APPROVER",
        fullName: "Tier 1 Approver",
        status: "ACTIVE",
      },
    });
    approverUserId = approverUser.id;

    const fmUser = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "fm@matrix.test",
        passwordHash: "dummy",
        role: "FINANCE_MANAGER",
        fullName: "Finance Manager",
        status: "ACTIVE",
      },
    });
    financeManagerId = fmUser.id;

    const roUser = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "ro@matrix.test",
        passwordHash: "dummy",
        role: "READ_ONLY",
        fullName: "Read Only",
        status: "ACTIVE",
      },
    });
    readOnlyUserId = roUser.id;
  });

  async function createInvoiceAndApprovalFixture({
    amount,
    creatorId,
    state = "WAITING_APPROVAL",
    hasException = false,
  }: {
    amount: number;
    creatorId?: string;
    state?: "WAITING_APPROVAL" | "RECEIVED";
    hasException?: boolean;
  }) {
    const inv = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber: `INV-MAT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
        totalAmount: amount,
        currency: "INR",
        status: state === "WAITING_APPROVAL" ? "PENDING_APPROVAL" : "RECEIVED",
        workflowState: state,
      },
    });

    await prisma.workflowInstance.create({
      data: {
        invoiceId: inv.id,
        currentState: state,
      },
    });

    const approval = await prisma.approval.create({
      data: {
        invoiceId: inv.id,
        approverId: approverUserId,
        status: "PENDING",
      },
    });

    if (creatorId) {
      await prisma.auditLog.create({
        data: {
          organizationId: orgId,
          userId: creatorId,
          action: "INVOICE_CREATED",
          entityType: "INVOICE",
          entityId: inv.id,
          result: "SUCCESS",
        },
      });
    }

    if (hasException) {
      await prisma.exception.create({
        data: {
          organizationId: orgId,
          invoiceId: inv.id,
          type: "PRICE_DIFFERENCE",
          severity: "HIGH",
          title: "Unresolved Price Discrepancy",
          description: "Blocking exception test",
          status: "OPEN",
        },
      });
    }

    return { invoice: inv, approval };
  }

  // Parameterized Test Runner for both endpoints/services
  const endpoints = [
    {
      name: "POST /invoices/:id/transitions (APPROVE)",
      execute: async (params: {
        invoiceId: string;
        approvalId: string;
        userId: string;
        role: Role;
        overrideSoloAdmin?: boolean;
        overrideReason?: string;
      }) => {
        return transitionInvoice(
          orgId,
          params.invoiceId,
          "APPROVE",
          params.userId,
          "Transition approve notes",
          params.role,
          params.overrideSoloAdmin,
          params.overrideReason
        );
      },
    },
    {
      name: "POST /approvals/:id/approve",
      execute: async (params: {
        invoiceId: string;
        approvalId: string;
        userId: string;
        role: Role;
        overrideSoloAdmin?: boolean;
        overrideReason?: string;
      }) => {
        return approveApproval(
          orgId,
          params.approvalId,
          params.userId,
          params.role,
          "Approval approve notes",
          params.overrideSoloAdmin,
          params.overrideReason
        );
      },
    },
  ];

  describe.each(endpoints)("Endpoint: $name", ({ execute }) => {
    it("1. Blocks APPROVER attempting an amount above Tier 1 limit", async () => {
      const tier1Limit = DEFAULT_INR_TIERS[0].maxAmount!; // 100,000
      const amountAboveTier1 = tier1Limit + 25_000; // 125,000 (Tier 2)
      const { invoice, approval } = await createInvoiceAndApprovalFixture({
        amount: amountAboveTier1,
      });

      await expect(
        execute({
          invoiceId: invoice.id,
          approvalId: approval.id,
          userId: approverUserId,
          role: "APPROVER",
        })
      ).rejects.toThrow(new RegExp(`Role "APPROVER" is not authorized to approve invoices of amount ${amountAboveTier1}`, "i"));
    });

    it("1b. Blocks FINANCE_MANAGER attempting an amount above Tier 2 limit", async () => {
      const tier2Limit = DEFAULT_INR_TIERS[1].maxAmount!; // 500,000
      const amountAboveTier2 = tier2Limit + 50_000; // 550,000 (Tier 3)
      const { invoice, approval } = await createInvoiceAndApprovalFixture({
        amount: amountAboveTier2,
      });

      await expect(
        execute({
          invoiceId: invoice.id,
          approvalId: approval.id,
          userId: financeManagerId,
          role: "FINANCE_MANAGER",
        })
      ).rejects.toThrow(new RegExp(`Role "FINANCE_MANAGER" is not authorized to approve invoices of amount ${amountAboveTier2}`, "i"));
    });

    it("2. Blocks creator self-approval under Segregation of Duties (SoD)", async () => {
      const { invoice, approval } = await createInvoiceAndApprovalFixture({
        amount: 50_000,
        creatorId: financeManagerId,
      });

      await expect(
        execute({
          invoiceId: invoice.id,
          approvalId: approval.id,
          userId: financeManagerId,
          role: "FINANCE_MANAGER",
        })
      ).rejects.toThrow(/Segregation of Duties \(SoD\) violation/i);
    });

    it("3. Allows Solo-Admin override with >=10 char reason and writes AuditLog in same transaction", async () => {
      // Deactivate second admin so org has exactly 1 active admin
      await prisma.user.update({
        where: { id: secondAdminId },
        data: { status: "DEACTIVATED" },
      });

      const { invoice, approval } = await createInvoiceAndApprovalFixture({
        amount: 80_000,
        creatorId: creatorAdminId,
      });

      const res = await execute({
        invoiceId: invoice.id,
        approvalId: approval.id,
        userId: creatorAdminId,
        role: "ADMINISTRATOR",
        overrideSoloAdmin: true,
        overrideReason: "Emergency sole proprietor operational signoff",
      });

      expect(res).toBeDefined();

      // Check invoice is approved
      const updatedInv = await prisma.invoice.findUnique({
        where: { id_organizationId: { id: invoice.id, organizationId: orgId } },
      });
      expect(updatedInv?.workflowState).toBe("SCHEDULED"); // WAITING_APPROVAL -> APPROVED event transitions to SCHEDULED

      // Verify AuditLog record written in same transaction with real columns (beforeData, afterData)
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgId,
          entityId: invoice.id,
          action: "SOD_OVERRIDE_SELF_APPROVAL",
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(creatorAdminId);
      expect(auditLog?.beforeData).toEqual(
        expect.objectContaining({ sodEnforced: true })
      );
      expect(auditLog?.afterData).toEqual(
        expect.objectContaining({
          sodOverridden: true,
          overrideReason: "Emergency sole proprietor operational signoff",
          activeAdminCount: 1,
        })
      );
    });

    it("4. Refuses Solo-Admin override when organization has multiple active admins", async () => {
      // Org has 2 active admins (creatorAdminId and secondAdminId)
      const { invoice, approval } = await createInvoiceAndApprovalFixture({
        amount: 80_000,
        creatorId: creatorAdminId,
      });

      await expect(
        execute({
          invoiceId: invoice.id,
          approvalId: approval.id,
          userId: creatorAdminId,
          role: "ADMINISTRATOR",
          overrideSoloAdmin: true,
          overrideReason: "Emergency sole proprietor operational signoff",
        })
      ).rejects.toThrow(/only permitted for single-administrator organizations/i);
    });

    it("5. Refuses Solo-Admin override without justification reason or reason < 10 characters", async () => {
      await prisma.user.update({
        where: { id: secondAdminId },
        data: { status: "DEACTIVATED" },
      });

      const { invoice, approval } = await createInvoiceAndApprovalFixture({
        amount: 80_000,
        creatorId: creatorAdminId,
      });

      await expect(
        execute({
          invoiceId: invoice.id,
          approvalId: approval.id,
          userId: creatorAdminId,
          role: "ADMINISTRATOR",
          overrideSoloAdmin: true,
          overrideReason: "short",
        })
      ).rejects.toThrow(/justification reason of at least 10 characters is required/i);
    });

    it("6. Refuses approval when invoice has an open blocking exception", async () => {
      const { invoice, approval } = await createInvoiceAndApprovalFixture({
        amount: 50_000,
        hasException: true,
      });

      await expect(
        execute({
          invoiceId: invoice.id,
          approvalId: approval.id,
          userId: financeManagerId,
          role: "FINANCE_MANAGER",
        })
      ).rejects.toThrow(/unresolved blocking exception/i);
    });

    it("7. Refuses approval when user has READ_ONLY role", async () => {
      const { invoice, approval } = await createInvoiceAndApprovalFixture({
        amount: 10_000,
      });

      await expect(
        execute({
          invoiceId: invoice.id,
          approvalId: approval.id,
          userId: readOnlyUserId,
          role: "READ_ONLY",
        })
      ).rejects.toThrow(/not authorized to approve/i);
    });

    it("8. Allows valid approval within tier without SoD conflict (covers APPROVER at Tier 1, FINANCE_MANAGER at Tier 2, and ADMINISTRATOR at Tier 3)", async () => {
      // 8a. APPROVER approving within Tier 1
      const tier1Amount = DEFAULT_INR_TIERS[0].maxAmount! - 20_000; // ₹80,000
      const fixtureTier1 = await createInvoiceAndApprovalFixture({
        amount: tier1Amount,
      });
      const res1 = await execute({
        invoiceId: fixtureTier1.invoice.id,
        approvalId: fixtureTier1.approval.id,
        userId: approverUserId,
        role: "APPROVER",
      });
      expect(res1).toBeDefined();
      const updated1 = await prisma.invoice.findUnique({
        where: { id_organizationId: { id: fixtureTier1.invoice.id, organizationId: orgId } },
      });
      expect(updated1?.workflowState).toBe("SCHEDULED");

      // 8b. FINANCE_MANAGER approving at Tier 2
      const tier2Amount = DEFAULT_INR_TIERS[1].maxAmount! - 50_000; // ₹450,000
      const fixtureTier2 = await createInvoiceAndApprovalFixture({
        amount: tier2Amount,
      });
      const res2 = await execute({
        invoiceId: fixtureTier2.invoice.id,
        approvalId: fixtureTier2.approval.id,
        userId: financeManagerId,
        role: "FINANCE_MANAGER",
      });
      expect(res2).toBeDefined();
      const updated2 = await prisma.invoice.findUnique({
        where: { id_organizationId: { id: fixtureTier2.invoice.id, organizationId: orgId } },
      });
      expect(updated2?.workflowState).toBe("SCHEDULED");

      // 8c. ADMINISTRATOR approving at Tier 3
      const tier3Amount = (DEFAULT_INR_TIERS[2].minAmount || 500_001) + 100_000; // ₹600,000
      const fixtureTier3 = await createInvoiceAndApprovalFixture({
        amount: tier3Amount,
        creatorId: financeManagerId, // Non-admin creator so admin has no SoD conflict
      });
      const res3 = await execute({
        invoiceId: fixtureTier3.invoice.id,
        approvalId: fixtureTier3.approval.id,
        userId: secondAdminId,
        role: "ADMINISTRATOR",
      });
      expect(res3).toBeDefined();
      const updated3 = await prisma.invoice.findUnique({
        where: { id_organizationId: { id: fixtureTier3.invoice.id, organizationId: orgId } },
      });
      expect(updated3?.workflowState).toBe("SCHEDULED");
    });

    it("executes successfully under NODE_ENV=production with strict tenant guard and no unguarded queries", async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      try {
        const fixture = await createInvoiceAndApprovalFixture({
          amount: 25_000,
        });
        const res = await approveApproval(orgId, fixture.approval.id, approverUserId);
        expect(res).toBeDefined();

        const updated = await prisma.invoice.findUnique({
          where: { id_organizationId: { id: fixture.invoice.id, organizationId: orgId } },
        });
        expect(updated?.workflowState).toBe("SCHEDULED");
        expect(updated?.status).toBe("SCHEDULED");
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });
  });
});
