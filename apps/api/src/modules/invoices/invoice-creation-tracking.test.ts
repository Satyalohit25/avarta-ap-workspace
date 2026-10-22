import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "../../config/database";
import { createInvoice } from "./service";
import { decryptTrackingToken, hashTrackingToken } from "../../lib/crypto";

describe("Invoice Creation Automatic Tracking Token Generation", () => {
  const orgId = "org-create-track-test";
  let supplierId: string;

  beforeEach(async () => {
    await prisma.invoiceLine.deleteMany({ where: { invoice: { organizationId: orgId } } });
    await prisma.workflowTransition.deleteMany({
      where: { workflowInstance: { invoice: { organizationId: orgId } } },
    });
    await prisma.workflowInstance.deleteMany({ where: { invoice: { organizationId: orgId } } });
    await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
    await prisma.supplier.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });

    await prisma.organization.create({
      data: {
        id: orgId,
        name: "Creation Tracking Test Org",
      },
    });

    const supplier = await prisma.supplier.create({
      data: {
        organizationId: orgId,
        supplierCode: "SUPP-AUTO-01",
        legalName: "Auto Tracking Vendor Legal",
        displayName: "Auto Tracking Vendor",
        status: "ACTIVE",
      },
    });
    supplierId = supplier.id;
  });

  it("automatically generates encrypted token, sha256 hash, and 90-day expiry on createInvoice", async () => {
    const inv = await createInvoice({
      organizationId: orgId,
      invoiceNumber: `INV-AUTO-${Date.now().toString().slice(-6)}`,
      supplierId,
      totalAmount: 50000,
      subtotalAmount: 50000,
      taxAmount: 0,
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      currency: "INR",
      lines: [
        {
          lineNumber: 1,
          description: "Consulting Services",
          quantity: 1,
          unitPrice: 50000,
          lineAmount: 50000,
        },
      ],
    });

    const fullInvoice = await prisma.invoice.findUnique({
      where: { id: inv.id },
      select: {
        id: true,
        createdAt: true,
        trackingTokenHash: true,
        trackingTokenEncrypted: true,
        trackingTokenExpiresAt: true,
      },
    });

    expect(fullInvoice).not.toBeNull();
    expect(fullInvoice!.trackingTokenHash).toBeDefined();
    expect(typeof fullInvoice!.trackingTokenHash).toBe("string");
    expect(fullInvoice!.trackingTokenHash!.length).toBe(64); // SHA-256 hex string

    expect(fullInvoice!.trackingTokenEncrypted).toBeDefined();
    expect(typeof fullInvoice!.trackingTokenEncrypted).toBe("string");

    // Decrypt token and verify hash matches
    const decryptedRawToken = decryptTrackingToken(fullInvoice!.trackingTokenEncrypted!);
    expect(decryptedRawToken).toBeDefined();
    expect(hashTrackingToken(decryptedRawToken)).toBe(fullInvoice!.trackingTokenHash);

    // Verify expiry is ~90 days from createdAt
    expect(fullInvoice!.trackingTokenExpiresAt).not.toBeNull();
    const expiryTime = fullInvoice!.trackingTokenExpiresAt!.getTime();
    const createdTime = fullInvoice!.createdAt.getTime();
    const diffDays = Math.round((expiryTime - createdTime) / (24 * 60 * 60 * 1000));
    expect(diffDays).toBeGreaterThanOrEqual(89);
    expect(diffDays).toBeLessThanOrEqual(91);
  });
});
