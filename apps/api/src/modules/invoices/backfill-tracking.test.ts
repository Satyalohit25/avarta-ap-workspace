import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../config/database";
import { backfillInvoiceTrackingTokens } from "./backfill-tracking";

describe("Item 10: Idempotent Tracking Backfill and Expiry Recomputation", () => {
  const orgId = "org-backfill-test-item10";
  let invoiceWithoutTokenId: string;
  let invoiceWithOld30dExpiryId: string;
  let paidInvoiceWithOld90dExpiryId: string;

  beforeAll(async () => {
    await prisma.organization.upsert({
      where: { id: orgId },
      update: {},
      create: { id: orgId, name: "Backfill Test Org" },
    });

    // 1. Invoice with null trackingTokenHash
    const inv1 = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber: "INV-BKF-NULL",
        totalAmount: 1000,
        currency: "INR",
        status: "RECEIVED",
        workflowState: "RECEIVED",
        dueDate: new Date(),
        invoiceDate: new Date(),
      },
    });
    invoiceWithoutTokenId = inv1.id;

    // 2. Invoice with old 30-day expiry (from initial backfill)
    const old30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const inv2 = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber: "INV-BKF-OLD-30D",
        totalAmount: 2000,
        currency: "INR",
        status: "RECEIVED",
        workflowState: "RECEIVED",
        trackingTokenHash: "old-hash-30d",
        trackingTokenEncrypted: "old-encrypted-30d",
        trackingTokenExpiresAt: old30d,
        dueDate: new Date(),
        invoiceDate: new Date(),
      },
    });
    invoiceWithOld30dExpiryId = inv2.id;

    // 3. PAID invoice with old 90-day expiry (from initial backfill)
    const old90d = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const inv3 = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber: "INV-BKF-PAID-90D",
        totalAmount: 3000,
        currency: "INR",
        status: "PAID",
        workflowState: "PAID",
        trackingTokenHash: "old-hash-90d-paid",
        trackingTokenEncrypted: "old-encrypted-90d-paid",
        trackingTokenExpiresAt: old90d,
        dueDate: new Date(),
        invoiceDate: new Date(),
      },
    });
    paidInvoiceWithOld90dExpiryId = inv3.id;
  });

  afterAll(async () => {
    await prisma.invoice.deleteMany({
      where: {
        id: { in: [invoiceWithoutTokenId, invoiceWithOld30dExpiryId, paidInvoiceWithOld90dExpiryId] },
      },
    });
    await prisma.organization.deleteMany({ where: { id: orgId } });
  });

  it("backfills null tokens with 90d and recomputes existing 30d/90d expiries to 90d/270d", async () => {
    const result = await backfillInvoiceTrackingTokens();
    expect(result.created).toBeGreaterThanOrEqual(1);
    expect(result.recomputed).toBeGreaterThanOrEqual(2);

    // Verify invoice with previously null token got populated with 90-day expiry
    const inv1 = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceWithoutTokenId } });
    expect(inv1.trackingTokenHash).toBeDefined();
    expect(inv1.trackingTokenEncrypted).toBeDefined();
    expect(inv1.trackingTokenExpiresAt).toBeDefined();
    const inv1RemainingDays = (inv1.trackingTokenExpiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(inv1RemainingDays).toBeGreaterThan(80);
    expect(inv1RemainingDays).toBeLessThanOrEqual(91);

    // Verify invoice with old 30d expiry got recomputed to 90 days
    const inv2 = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceWithOld30dExpiryId } });
    const inv2RemainingDays = (inv2.trackingTokenExpiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(inv2RemainingDays).toBeGreaterThan(80);
    expect(inv2RemainingDays).toBeLessThanOrEqual(91);

    // Verify PAID invoice with old 90d expiry got recomputed to 270 days (90 + 180)
    const inv3 = await prisma.invoice.findUniqueOrThrow({ where: { id: paidInvoiceWithOld90dExpiryId } });
    const inv3RemainingDays = (inv3.trackingTokenExpiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(inv3RemainingDays).toBeGreaterThan(250);
    expect(inv3RemainingDays).toBeLessThanOrEqual(271);
  });

  it("is strictly idempotent on subsequent runs", async () => {
    // Run a second time
    const secondResult = await backfillInvoiceTrackingTokens();
    // No new tokens should be created, and already-compliant expiries should not be recomputed
    expect(secondResult.created).toBe(0);
    expect(secondResult.recomputed).toBe(0);
  });
});
