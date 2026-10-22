import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "../../config/database";
import { executeInvoiceApproval, executeInvoiceRejection } from "./service";
import { createException } from "../exceptions/service";

describe("Pessimistic Row Locking & Concurrency Protection (Day 1.5 Item 4)", () => {
  const orgId = "org-concurrency-test";
  let managerId: string;
  let adminId: string;

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
    await prisma.payment.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });

    await prisma.organization.create({
      data: {
        id: orgId,
        name: "Concurrency Test Org",
        defaultCurrency: "INR",
        country: "IN",
      },
    });

    const manager = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "manager@concurrency.test",
        passwordHash: "dummy",
        role: "FINANCE_MANAGER",
        fullName: "Test Manager",
      },
    });
    managerId = manager.id;

    const admin = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "admin@concurrency.test",
        passwordHash: "dummy",
        role: "ADMINISTRATOR",
        fullName: "Test Admin",
      },
    });
    adminId = admin.id;
  });

  async function createTestInvoice(state: "WAITING_APPROVAL" | "RECEIVED" | "VALIDATED" = "WAITING_APPROVAL") {
    const inv = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber: `INV-CONCUR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
        totalAmount: 10000,
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

    return inv;
  }

  it("fails with 409 Conflict when invoice workflowState is not WAITING_APPROVAL", async () => {
    const inv = await createTestInvoice("RECEIVED");

    await expect(
      executeInvoiceApproval({
        organizationId: orgId,
        invoiceId: inv.id,
        userId: managerId,
        userRole: "FINANCE_MANAGER",
        notes: "Premature approval attempt",
      })
    ).rejects.toThrow(/not waiting for approval|current workflow state/i);
  });

  it("handles double-approval race: exactly one succeeds, second gets 409 Conflict", async () => {
    const inv = await createTestInvoice("WAITING_APPROVAL");

    const [res1, res2] = await Promise.allSettled([
      executeInvoiceApproval({
        organizationId: orgId,
        invoiceId: inv.id,
        userId: managerId,
        userRole: "FINANCE_MANAGER",
        notes: "Approval 1",
      }),
      executeInvoiceApproval({
        organizationId: orgId,
        invoiceId: inv.id,
        userId: adminId,
        userRole: "ADMINISTRATOR",
        notes: "Approval 2",
      }),
    ]);

    const successes = [res1, res2].filter((r) => r.status === "fulfilled");
    const rejections = [res1, res2].filter((r) => r.status === "rejected");

    expect(successes).toHaveLength(1);
    expect(rejections).toHaveLength(1);
    const err = (rejections[0] as PromiseRejectedResult).reason;
    expect(err.statusCode || err.status).toBe(409);
  });

  it("fails approval with 409 Conflict if an exception is created concurrently with row lock", async () => {
    const inv = await createTestInvoice("WAITING_APPROVAL");

    // Create an exception which locks the row
    await createException({
      organizationId: orgId,
      invoiceId: inv.id,
      type: "PRICE_DIFFERENCE",
      severity: "HIGH",
      title: "Price Mismatch Exception",
      description: "Detected line item price discrepancy",
    });

    // Approval must re-check exceptions after locking row and throw 409
    await expect(
      executeInvoiceApproval({
        organizationId: orgId,
        invoiceId: inv.id,
        userId: managerId,
        userRole: "FINANCE_MANAGER",
        notes: "Approving with exception",
      })
    ).rejects.toThrow(/unresolved blocking exception/i);
  });

  it("executeInvoiceRejection locks the row and fails with 409 if workflowState is not WAITING_APPROVAL", async () => {
    const inv = await createTestInvoice("RECEIVED");

    await expect(
      executeInvoiceRejection({
        organizationId: orgId,
        invoiceId: inv.id,
        userId: managerId,
        reason: "Rejecting premature invoice",
      })
    ).rejects.toThrow(/not waiting for approval|current workflow state/i);
  });

  it("handles approval vs rejection race: exactly one succeeds, second gets 409 Conflict", async () => {
    const inv = await createTestInvoice("WAITING_APPROVAL");

    const [resApproval, resRejection] = await Promise.allSettled([
      executeInvoiceApproval({
        organizationId: orgId,
        invoiceId: inv.id,
        userId: managerId,
        userRole: "FINANCE_MANAGER",
        notes: "Concurrent approval",
      }),
      executeInvoiceRejection({
        organizationId: orgId,
        invoiceId: inv.id,
        userId: adminId,
        reason: "Concurrent rejection",
      }),
    ]);

    const successes = [resApproval, resRejection].filter((r) => r.status === "fulfilled");
    const rejections = [resApproval, resRejection].filter((r) => r.status === "rejected");

    expect(successes).toHaveLength(1);
    expect(rejections).toHaveLength(1);
    const err = (rejections[0] as PromiseRejectedResult).reason;
    expect(err.statusCode || err.status).toBe(409);
  });
});
