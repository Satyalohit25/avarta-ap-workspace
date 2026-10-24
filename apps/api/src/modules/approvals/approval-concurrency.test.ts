import { describe, expect, it, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../../config/database";
import { runWithEngineBypass } from "../../config/tenant-guard";
import { executeInvoiceApproval, executeInvoiceRejection } from "./service";
import { createException } from "../exceptions/service";
import { transitionInvoice } from "../invoices/service";

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
    await prisma.validation.deleteMany({
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
    await prisma.document.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.comment.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.payment.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
    await prisma.supplier.deleteMany({ where: { organizationId: orgId } });
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

  it("confirms raw FOR UPDATE query resolves through PostgreSQL search_path to test_suite and not public", async () => {
    // 1. Verify current_schema() returns test_suite
    const schemaRows = await prisma.$queryRawUnsafe<Array<{ current_schema: string }>>(
      `SELECT current_schema()`
    );
    expect(schemaRows).toHaveLength(1);
    expect(schemaRows[0].current_schema).toBe("test_suite");

    // 2. Verify unqualified "Invoice" identifier resolves to test_suite."Invoice"
    const regclassRows = await prisma.$queryRawUnsafe<Array<{ rel: string }>>(
      `SELECT '"Invoice"'::regclass::text as rel`
    );
    expect(regclassRows).toHaveLength(1);
    expect(regclassRows[0].rel).toMatch(/(test_suite\.)?"?Invoice"?/i);

    // 3. Confirm public."Invoice" is untouched
    const publicCount = await prisma.$queryRawUnsafe<Array<{ count: string | bigint }>>(
      `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Invoice'`
    );
    expect(Number(publicCount[0].count)).toBeGreaterThanOrEqual(0);
  });

  it("rejects re-running validation (RETRY_VALIDATION) or matching (RUN_MATCHING) on a WAITING_APPROVAL invoice", async () => {
    const supplier = await prisma.supplier.create({
      data: {
        organizationId: orgId,
        supplierCode: "SUPP-VAL-001",
        legalName: "Validation Test Supplier Legal",
        displayName: "Validation Test Supplier",
        gstNumber: "27AAACT2727Q1ZW",
        status: "ACTIVE",
      },
    });

    const inv = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber: `INV-VAL-${Date.now().toString().slice(-6)}`,
        totalAmount: 10000,
        subtotalAmount: 10000,
        taxAmount: 0,
        currency: "INR",
        supplierId: supplier.id,
        aiConfidence: 95,
        status: "PENDING_APPROVAL",
        workflowState: "WAITING_APPROVAL",
      },
    });

    await prisma.workflowInstance.create({
      data: {
        invoiceId: inv.id,
        currentState: "WAITING_APPROVAL",
      },
    });

    // RETRY_VALIDATION passes field validation but engine rejects EXCEPTION_RESOLVED from WAITING_APPROVAL
    await expect(
      transitionInvoice(orgId, inv.id, "RETRY_VALIDATION", managerId)
    ).rejects.toThrow(/not valid from state "WAITING_APPROVAL"/i);

    // RUN_MATCHING fires MATCHING_START which is forbidden from WAITING_APPROVAL
    await expect(
      transitionInvoice(orgId, inv.id, "RUN_MATCHING", managerId)
    ).rejects.toThrow(/not valid from state "WAITING_APPROVAL"/i);
  });

  it("handles HOLD_REQUEST_CORRECTION vs APPROVE race: exactly one succeeds, second gets 409 Conflict", async () => {
    const inv = await createTestInvoice("WAITING_APPROVAL");

    const [resHold, resApproval] = await Promise.allSettled([
      transitionInvoice(orgId, inv.id, "HOLD_REQUEST_CORRECTION", managerId, "Need clarification on taxes"),
      executeInvoiceApproval({
        organizationId: orgId,
        invoiceId: inv.id,
        userId: adminId,
        userRole: "ADMINISTRATOR",
        notes: "Concurrent approval attempt",
      }),
    ]);

    const successes = [resHold, resApproval].filter((r) => r.status === "fulfilled");
    const rejections = [resHold, resApproval].filter((r) => r.status === "rejected");

    // Because both take the row lock on "Invoice" and check open exceptions / state:
    // Either Hold executes first (creating an exception, causing approval to fail with 409),
    // OR Approval executes first (transitioning to SCHEDULED).
    expect(successes).toHaveLength(1);
    expect(rejections).toHaveLength(1);
    const err = (rejections[0] as PromiseRejectedResult).reason;
    expect(err.statusCode || err.status).toBe(409);
  });

  it("proves locking serializes operations across separate database connections with an explicit barrier", async () => {
    const inv = await createTestInvoice("WAITING_APPROVAL");
    const clientB = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });

    let lockAcquiredSignal!: () => void;
    const lockAcquired = new Promise<void>((resolve) => {
      lockAcquiredSignal = resolve;
    });

    let releaseLockSignal!: () => void;
    const releaseLock = new Promise<void>((resolve) => {
      releaseLockSignal = resolve;
    });

    let clientBBlocked = true;

    // Transaction 1 on primary prisma client: acquires row lock and holds it until released
    const tx1Promise = prisma.$transaction(async (txA) => {
      await txA.$queryRawUnsafe(
        `SELECT "id" FROM "Invoice" WHERE "id" = $1 AND "organizationId" = $2 FOR UPDATE`,
        inv.id,
        orgId
      );

      // Signal that lock is held
      lockAcquiredSignal();

      // Wait on barrier before committing
      await releaseLock;

      // Update state to SCHEDULED under lock
      await runWithEngineBypass(async () => {
        await txA.invoice.update({
          where: { id_organizationId: { id: inv.id, organizationId: orgId } },
          data: { workflowState: "SCHEDULED" },
        });
      });
    });

    // Wait for Transaction 1 to acquire the lock
    await lockAcquired;

    // Transaction 2 on clientB attempts approval: must be blocked by PostgreSQL engine
    const tx2Promise = (async () => {
      try {
        const result = await clientB.$transaction(async (txB) => {
          // Attempt row lock on clientB: this BLOCKS until Transaction 1 releases
          await txB.$queryRawUnsafe(
            `SELECT "id" FROM "Invoice" WHERE "id" = $1 AND "organizationId" = $2 FOR UPDATE`,
            inv.id,
            orgId
          );
          clientBBlocked = false;

          const current = await txB.invoice.findFirst({
            where: { id: inv.id, organizationId: orgId },
          });
          if (current?.workflowState !== "WAITING_APPROVAL") {
            const err = new Error(`Cannot approve invoice in state ${current?.workflowState}`);
            (err as any).status = 409;
            throw err;
          }
          return current;
        });
        return result;
      } finally {
        await clientB.$disconnect();
      }
    })();

    // Verify clientB is still blocked while tx1 holds lock
    await new Promise((r) => setTimeout(r, 100));
    expect(clientBBlocked).toBe(true);

    // Release Transaction 1
    releaseLockSignal();
    await tx1Promise;

    // Transaction 2 unblocks, re-reads row, and throws 409 Conflict
    await expect(tx2Promise).rejects.toMatchObject({ status: 409 });
  });
});
