import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "../../config/database";
import { bulkApproveInvoices } from "./service";

describe("T-308: Server-side Bulk Approve Invoices", () => {
  const orgId = "org-bulk-approve-test";
  let adminUserId: string;
  let approverUserId: string;
  let financeExecutiveId: string;

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
        name: "Bulk Approve Test Org",
        defaultCurrency: "INR",
        country: "IN",
      },
    });

    const admin = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "admin@bulk.test",
        passwordHash: "dummy",
        role: "ADMINISTRATOR",
        fullName: "Bulk Admin",
        status: "ACTIVE",
      },
    });
    adminUserId = admin.id;

    const approver = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "approver@bulk.test",
        passwordHash: "dummy",
        role: "APPROVER",
        fullName: "Bulk Approver",
        status: "ACTIVE",
      },
    });
    approverUserId = approver.id;

    const executive = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "exec@bulk.test",
        passwordHash: "dummy",
        role: "FINANCE_EXECUTIVE",
        fullName: "Bulk Executive",
        status: "ACTIVE",
      },
    });
    financeExecutiveId = executive.id;
  });

  async function createInvoiceFixture({
    invoiceNumber,
    amount,
    currency = "INR",
    workflowState = "WAITING_APPROVAL",
    hasOpenException = false,
    creatorId,
    subtotal = 1000,
    tax = 180,
  }: {
    invoiceNumber: string;
    amount: number;
    currency?: string;
    workflowState?: string;
    hasOpenException?: boolean;
    creatorId?: string;
    subtotal?: number;
    tax?: number;
  }) {
    const inv = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber,
        totalAmount: amount,
        subtotalAmount: subtotal,
        taxAmount: tax,
        currency,
        status: workflowState === "WAITING_APPROVAL" ? "PENDING_APPROVAL" : "RECEIVED",
        workflowState,
      },
    });

    await prisma.workflowInstance.create({
      data: {
        invoiceId: inv.id,
        currentState: workflowState,
      },
    });

    await prisma.approval.create({
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

    if (hasOpenException) {
      await prisma.exception.create({
        data: {
          organizationId: orgId,
          invoiceId: inv.id,
          type: "TAX_DIFFERENCE",
          severity: "HIGH",
          title: "Tax mismatch",
          description: "Blocking exception for test",
          status: "OPEN",
        },
      });
    }

    return inv;
  }

  it("successfully bulk approves multiple eligible invoices within tier limits", async () => {
    const inv1 = await createInvoiceFixture({ invoiceNumber: "INV-B-001", amount: 50_000, creatorId: financeExecutiveId });
    const inv2 = await createInvoiceFixture({ invoiceNumber: "INV-B-002", amount: 75_000, creatorId: financeExecutiveId });

    const result = await bulkApproveInvoices(
      orgId,
      [inv1.id, inv2.id],
      approverUserId,
      "APPROVER",
      "Bulk approved by manager"
    );

    expect(result.processed).toBe(2);
    expect(result.succeeded).toEqual([inv1.id, inv2.id]);
    expect(result.failed).toHaveLength(0);

    const check1 = await prisma.invoice.findFirst({ where: { id: inv1.id, organizationId: orgId } });
    const check2 = await prisma.invoice.findFirst({ where: { id: inv2.id, organizationId: orgId } });
    expect(check1?.workflowState).toBe("SCHEDULED");
    expect(check2?.workflowState).toBe("SCHEDULED");
  });

  it("handles mixed batches: succeeds eligible invoices while reporting per-item failure reasons", async () => {
    // inv1: Valid under Tier 1 limit (50k)
    const inv1 = await createInvoiceFixture({ invoiceNumber: "INV-B-MIX-1", amount: 50_000, creatorId: financeExecutiveId });
    // inv2: Exceeds Tier 1 limit (150k > 100k) for APPROVER
    const inv2 = await createInvoiceFixture({ invoiceNumber: "INV-B-MIX-2", amount: 150_000, creatorId: financeExecutiveId });
    // inv3: Has open blocking exception
    const inv3 = await createInvoiceFixture({ invoiceNumber: "INV-B-MIX-3", amount: 20_000, creatorId: financeExecutiveId, hasOpenException: true });
    // inv4: SoD violation (approver created this invoice)
    const inv4 = await createInvoiceFixture({ invoiceNumber: "INV-B-MIX-4", amount: 30_000, creatorId: approverUserId });

    const result = await bulkApproveInvoices(
      orgId,
      [inv1.id, inv2.id, inv3.id, inv4.id],
      approverUserId,
      "APPROVER"
    );

    expect(result.processed).toBe(4);
    expect(result.succeeded).toEqual([inv1.id]);
    expect(result.failed).toHaveLength(3);

    const failReasons = result.failed.map((f) => ({ id: f.invoiceId, reason: f.reason }));
    expect(failReasons.find((f) => f.id === inv2.id)?.reason).toMatch(/not authorized to approve invoices of amount 150000/i);
    expect(failReasons.find((f) => f.id === inv3.id)?.reason).toMatch(/unresolved blocking exception/i);
    expect(failReasons.find((f) => f.id === inv4.id)?.reason).toMatch(/Segregation of Duties/i);

    // Verify inv1 transitioned, others remained WAITING_APPROVAL
    const check1 = await prisma.invoice.findFirst({ where: { id: inv1.id, organizationId: orgId } });
    const check2 = await prisma.invoice.findFirst({ where: { id: inv2.id, organizationId: orgId } });
    const check3 = await prisma.invoice.findFirst({ where: { id: inv3.id, organizationId: orgId } });
    const check4 = await prisma.invoice.findFirst({ where: { id: inv4.id, organizationId: orgId } });

    expect(check1?.workflowState).toBe("SCHEDULED");
    expect(check2?.workflowState).toBe("WAITING_APPROVAL");
    expect(check3?.workflowState).toBe("WAITING_APPROVAL");
    expect(check4?.workflowState).toBe("WAITING_APPROVAL");
  });

  it("writes individual audit entries and resolves approval records for succeeded invoices", async () => {
    const inv = await createInvoiceFixture({ invoiceNumber: "INV-B-AUDIT-1", amount: 45_000, creatorId: financeExecutiveId });

    await bulkApproveInvoices(
      orgId,
      [inv.id],
      adminUserId,
      "ADMINISTRATOR",
      "Executive signoff"
    );

    const approval = await prisma.approval.findFirst({
      where: { invoiceId: inv.id, invoice: { organizationId: orgId } },
    });
    expect(approval?.status).toBe("APPROVED");
    expect(approval?.comment).toBe("Executive signoff");

    const transition = await prisma.workflowTransition.findFirst({
      where: {
        workflowInstance: { invoice: { organizationId: orgId }, invoiceId: inv.id },
        event: "APPROVED",
      },
    });
    expect(transition).toBeDefined();
    expect(transition?.toState).toBe("SCHEDULED");
    expect(transition?.triggeredBy).toBe(adminUserId);
  });
});
