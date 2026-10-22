import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "../../config/database";
import { transitionInvoice } from "../invoices/service";
import { approveApproval } from "./service";
import { Role } from "../../middleware/permissions";

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
    it("1. Blocks APPROVER attempting an amount above their tier limit (₹600,000 > ₹500,000)", async () => {
      const { invoice, approval } = await createInvoiceAndApprovalFixture({
        amount: 600_000,
      });

      await expect(
        execute({
          invoiceId: invoice.id,
          approvalId: approval.id,
          userId: approverUserId,
          role: "APPROVER",
        })
      ).rejects.toThrow(/Role "APPROVER" is not authorized to approve invoices of amount 600000/i);
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
      const updatedInv = await prisma.invoice.findUnique({ where: { id: invoice.id } });
      expect(updatedInv?.workflowState).toBe("SCHEDULED"); // WAITING_APPROVAL -> APPROVED event transitions to SCHEDULED

      // Verify AuditLog record written in same transaction with real columns (beforeData, afterData)
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgId,
          entityId: invoice.id,
          action: "APPROVAL_SOD_OVERRIDE",
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

    it("8. Allows valid approval within tier without SoD conflict", async () => {
      const { invoice, approval } = await createInvoiceAndApprovalFixture({
        amount: 50_000,
      });

      const res = await execute({
        invoiceId: invoice.id,
        approvalId: approval.id,
        userId: financeManagerId,
        role: "FINANCE_MANAGER",
      });

      expect(res).toBeDefined();
      const updated = await prisma.invoice.findUnique({ where: { id: invoice.id } });
      expect(updated?.workflowState).toBe("SCHEDULED");
    });
  });
});
