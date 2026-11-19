import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../config/database";
import {
  calculateTrackingExpiry,
  TRACKING_TOKEN_ACTIVE_LIFESPAN_DAYS,
  TRACKING_TOKEN_PAID_LIFESPAN_DAYS,
} from "./tracking";
import { regenerateInvoiceTrackingToken } from "./service";
import { applyTransition } from "../../workflow/engine";

describe("T-307: Tracking Token Expiry Policy & Canonical Calculation", () => {
  const orgId = "org-tracking-expiry-t307";
  const userId = "usr-tracking-expiry-t307";

  beforeAll(async () => {
    await prisma.workflowTransition.deleteMany({
      where: { workflowInstance: { invoice: { organizationId: orgId } } },
    });
    await prisma.workflowInstance.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.payment.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.invoiceLine.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.invoice.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.auditLog.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.user.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.organization.deleteMany({
      where: { id: orgId },
    });

    await prisma.organization.create({
      data: { id: orgId, name: "Tracking Expiry Test Org" },
    });
    await prisma.user.create({
      data: {
        id: userId,
        organizationId: orgId,
        email: "finance@tracking-t307.test",
        passwordHash: "hash123",
        fullName: "Tracking Lead",
        role: "FINANCE_MANAGER",
      },
    });
  });

  afterAll(async () => {
    await prisma.workflowTransition.deleteMany({
      where: { workflowInstance: { invoice: { organizationId: orgId } } },
    });
    await prisma.workflowInstance.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.payment.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.invoiceLine.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.invoice.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.auditLog.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.user.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.organization.deleteMany({
      where: { id: orgId },
    });
  });

  describe("calculateTrackingExpiry unit tests", () => {
    it("exports constants 90 days active and 270 days paid retention", () => {
      expect(TRACKING_TOKEN_ACTIVE_LIFESPAN_DAYS).toBe(90);
      expect(TRACKING_TOKEN_PAID_LIFESPAN_DAYS).toBe(270);
    });

    it("calculates exact +90 days for active invoice statuses", () => {
      const baseDate = new Date("2026-06-01T00:00:00.000Z");
      const activeStatuses = [
        "RECEIVED",
        "CAPTURED",
        "VALIDATING",
        "VALIDATED",
        "MATCHING",
        "MATCHED",
        "WAITING_APPROVAL",
        "SCHEDULED",
        "PROCESSING_PAYMENT",
        "EXCEPTION",
      ];

      for (const status of activeStatuses) {
        const expiry = calculateTrackingExpiry(status, baseDate);
        const diffMs = expiry.getTime() - baseDate.getTime();
        const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
        expect(diffDays).toBe(90);
      }
    });

    it("calculates exact +270 days for PAID status", () => {
      const baseDate = new Date("2026-06-01T00:00:00.000Z");
      const expiry = calculateTrackingExpiry("PAID", baseDate);
      const diffMs = expiry.getTime() - baseDate.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(270);
    });

    it("handles lowercase 'paid' case-insensitively", () => {
      const baseDate = new Date("2026-06-01T00:00:00.000Z");
      const expiry = calculateTrackingExpiry("paid", baseDate);
      const diffDays = Math.round((expiry.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(270);
    });

    it("defaults to Date.now() when baseDate is omitted", () => {
      const before = Date.now();
      const expiry = calculateTrackingExpiry("RECEIVED");
      const after = Date.now();
      const expectedMin = before + 90 * 24 * 60 * 60 * 1000;
      const expectedMax = after + 90 * 24 * 60 * 60 * 1000;
      expect(expiry.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiry.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe("Integration: regenerateInvoiceTrackingToken", () => {
    it("regenerates token with 90-day expiry for active invoice", async () => {
      const inv = await prisma.invoice.create({
        data: {
          organizationId: orgId,
          invoiceNumber: "INV-REGEN-ACTIVE",
          totalAmount: 1500,
          currency: "INR",
          status: "SCHEDULED",
          workflowState: "SCHEDULED",
          dueDate: new Date(),
          invoiceDate: new Date(),
        },
      });

      const result = await regenerateInvoiceTrackingToken(orgId, inv.id);
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeDefined();

      const diffDays = Math.round((result.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(90);

      const dbInv = await prisma.invoice.findFirstOrThrow({
        where: { id: inv.id, organizationId: orgId },
      });
      expect(dbInv.trackingTokenExpiresAt).toBeDefined();
      expect(Math.round((dbInv.trackingTokenExpiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000))).toBe(90);
    });

    it("regenerates token with 270-day expiry for PAID invoice", async () => {
      const inv = await prisma.invoice.create({
        data: {
          organizationId: orgId,
          invoiceNumber: "INV-REGEN-PAID",
          totalAmount: 2500,
          currency: "INR",
          status: "PAID",
          workflowState: "PAID",
          dueDate: new Date(),
          invoiceDate: new Date(),
        },
      });

      const result = await regenerateInvoiceTrackingToken(orgId, inv.id);
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeDefined();

      const diffDays = Math.round((result.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(270);

      const dbInv = await prisma.invoice.findFirstOrThrow({
        where: { id: inv.id, organizationId: orgId },
      });
      expect(dbInv.trackingTokenExpiresAt).toBeDefined();
      expect(Math.round((dbInv.trackingTokenExpiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000))).toBe(270);
    });
  });

  describe("Integration: workflow transition to PAID extends expiry", () => {
    it("extends tracking token expiry to settlementDate + 270 days on PAID transition", async () => {
      const inv = await prisma.invoice.create({
        data: {
          organizationId: orgId,
          invoiceNumber: "INV-WF-EXTEND-PAID",
          totalAmount: 10000,
          currency: "INR",
          status: "PROCESSING",
          workflowState: "PROCESSING_PAYMENT",
          dueDate: new Date(),
          invoiceDate: new Date(),
          trackingTokenHash: "initial-hash",
          trackingTokenEncrypted: "initial-encrypted",
          trackingTokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // only 10 days remaining
        },
      });

      await prisma.workflowInstance.create({
        data: {
          invoiceId: inv.id,
          currentState: "PROCESSING_PAYMENT",
        },
      });

      const settlementDate = new Date("2026-07-15T12:00:00.000Z");
      await applyTransition({
        invoiceId: inv.id,
        organizationId: orgId,
        event: "PAYMENT_SUCCESS",
        triggeredBy: userId,
        utrNumber: "UTR-TEST-123",
        settlementDate,
      });

      const updatedInv = await prisma.invoice.findFirstOrThrow({
        where: { id: inv.id, organizationId: orgId },
      });
      expect(updatedInv.status).toBe("PAID");
      expect(updatedInv.workflowState).toBe("PAID");
      expect(updatedInv.trackingTokenExpiresAt).toBeDefined();

      // Should be settlementDate + 270 days
      const expectedExpiry = calculateTrackingExpiry("PAID", settlementDate);
      expect(updatedInv.trackingTokenExpiresAt!.toISOString()).toBe(expectedExpiry.toISOString());
    });
  });
});
