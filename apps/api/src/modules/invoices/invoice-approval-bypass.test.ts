import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "../../config/database";
import { transitionInvoice } from "./service";
import { applyTransition } from "../../workflow/engine";

describe("Approval Enforcement Unification & Bypass Elimination (ACT-P0-J)", () => {
  const orgId = "org-test-approval-bypass";
  let creatorId: string;
  let approverId: string;
  let highTierInvoiceId: string;
  let lowTierInvoiceId: string;

  beforeEach(async () => {
    // Clean up specifically for test org
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
    await prisma.document.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.invoiceLine.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.payment.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });

    await prisma.organization.create({
      data: {
        id: orgId,
        name: "Test Approval Bypass Org",
        defaultCurrency: "INR",
        country: "IN",
      },
    });

    const creator = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "creator@bypass.test",
        passwordHash: "dummyhash",
        role: "FINANCE_EXECUTIVE",
        fullName: "Creator User",
      },
    });
    creatorId = creator.id;

    const approver = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "approver@bypass.test",
        passwordHash: "dummyhash",
        role: "APPROVER",
        fullName: "Approver User",
      },
    });
    approverId = approver.id;

    // High tier invoice: 500,000 INR (Tier 2, requires FINANCE_MANAGER or ADMINISTRATOR)
    const highInv = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber: "INV-HIGH-500K",
        currency: "INR",
        subtotalAmount: 500000,
        taxAmount: 0,
        totalAmount: 500000,
        status: "PENDING_APPROVAL",
        workflowState: "WAITING_APPROVAL",
        dueDate: new Date(),
        invoiceDate: new Date(),
      },
    });
    highTierInvoiceId = highInv.id;
    await prisma.workflowInstance.create({
      data: {
        invoiceId: highTierInvoiceId,
        currentState: "WAITING_APPROVAL",
      },
    });

    // Record audit log for invoice creation by creator
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: creatorId,
        entityType: "INVOICE",
        entityId: highTierInvoiceId,
        action: "INVOICE_CREATED",
      },
    });

    // Low tier invoice: 50,000 INR (Tier 1, APPROVER authorized)
    const lowInv = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber: "INV-LOW-50K",
        currency: "INR",
        subtotalAmount: 50000,
        taxAmount: 0,
        totalAmount: 50000,
        status: "PENDING_APPROVAL",
        workflowState: "WAITING_APPROVAL",
        dueDate: new Date(),
        invoiceDate: new Date(),
      },
    });
    lowTierInvoiceId = lowInv.id;
    await prisma.workflowInstance.create({
      data: {
        invoiceId: lowTierInvoiceId,
        currentState: "WAITING_APPROVAL",
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: creatorId,
        entityType: "INVOICE",
        entityId: lowTierInvoiceId,
        action: "INVOICE_CREATED",
      },
    });
  });

  it("blocks APPROVER from approving 500,000 INR invoice via /transitions (enforces amount thresholds)", async () => {
    // Attempting /transitions with APPROVE as APPROVER on high tier invoice
    await expect(
      transitionInvoice(
        orgId,
        highTierInvoiceId,
        "APPROVE",
        approverId,
        "Attempting approval bypass via /transitions",
        "APPROVER"
      )
    ).rejects.toThrow(/not authorized to approve/);
  });

  it("blocks invoice creator from approving their own invoice via /transitions (enforces Segregation of Duties)", async () => {
    // Creator tries to approve low tier invoice via /transitions
    await expect(
      transitionInvoice(
        orgId,
        lowTierInvoiceId,
        "APPROVE",
        creatorId,
        "Self approval attempt",
        "APPROVER"
      )
    ).rejects.toThrow(/Segregation of Duties/);
  });

  it("blocks approval via /transitions when invoice has an unresolved blocking exception", async () => {
    await prisma.exception.create({
      data: {
        organizationId: orgId,
        invoiceId: lowTierInvoiceId,
        title: "Price Difference",
        type: "PRICE_DIFFERENCE",
        status: "OPEN",
        severity: "HIGH",
        description: "Price mismatch on line 1",
      },
    });

    await expect(
      transitionInvoice(
        orgId,
        lowTierInvoiceId,
        "APPROVE",
        approverId,
        "Trying to approve with open exception",
        "APPROVER"
      )
    ).rejects.toThrow(/unresolved blocking exception/);
  });
});
