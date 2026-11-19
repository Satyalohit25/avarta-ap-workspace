import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "../../config/database";
import { schedulePayment } from "../payments/service";
import { tdsLedger } from "./tds";
import { supplierMsmeStore } from "../suppliers/msme";
import { getInvoice } from "./service";

describe("EPIC 5: Indian Compliance Integration (T-501 & T-502)", () => {
  const orgId = "org-test-indian-compliance";
  let invoiceId: string;

  beforeEach(async () => {
    tdsLedger.clear(orgId);
    supplierMsmeStore.clear(orgId);

    await prisma.workflowTransition.deleteMany({
      where: { workflowInstance: { invoice: { organizationId: orgId } } },
    });
    await prisma.workflowInstance.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.approval.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.notification.deleteMany({ where: { organizationId: orgId } });
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
    await prisma.supplier.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });

    await prisma.organization.create({
      data: {
        id: orgId,
        name: "Test Indian Compliance Org",
        defaultCurrency: "INR",
        country: "IN",
      },
    });

    const supplier = await prisma.supplier.create({
      data: {
        organizationId: orgId,
        supplierCode: "SUP-IND-01",
        legalName: "Shree Ganesh Manufacturing Ltd",
        displayName: "Shree Ganesh Mfg",
        gstNumber: "27AAACG1234F1Z5",
        panNumber: "AAACG1234F", // Company PAN
        country: "IN",
        currency: "INR",
        paymentTermsDays: 60, // 60 days in agreement
      },
    });
    supplierId = supplier.id;

    // Register Micro Enterprise classification with valid Udyam number
    supplierMsmeStore.setProfile({
      organizationId: orgId,
      supplierId: supplier.id,
      supplierCode: supplier.supplierCode,
      msmeCategory: "MICRO",
      udyamNumber: "UDYAM-MH-12-0012345",
      hasWrittenAgreement: true,
    });

    const inv = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        supplierId: supplier.id,
        invoiceNumber: "INV-IND-2026-001",
        currency: "INR",
        totalAmount: 100000,
        subtotalAmount: 100000,
        taxAmount: 0,
        workflowState: "SCHEDULED",
        status: "SCHEDULED",
        invoiceDate: new Date("2026-05-01"),
      },
    });
    invoiceId = inv.id;

    await prisma.workflowInstance.create({
      data: {
        invoiceId: inv.id,
        currentState: "SCHEDULED",
      },
    });
  });

  describe("T-501: Automated TDS Deduction on Payment Generation", () => {
    it("deducts 2% TDS under Section 194C for Company and produces net payable payment", async () => {
      const payment = await schedulePayment(orgId, {
        invoiceId,
        amount: 100000,
        scheduledDate: "2026-05-15",
        applyTds: true,
        tdsSectionCode: "194C",
      });

      // Gross ₹100,000 - 2% TDS (₹2,000) = Net ₹98,000
      expect(Number(payment.amount)).toBe(98000);
      expect(payment.notes).toContain("TDS Deducted");
      expect(payment.notes).toContain("₹2000.00");
      expect(payment.notes).toContain("Sec 194C");

      // Verify entry recorded in TDS Payable Ledger
      const entries = tdsLedger.getEntries(orgId);
      expect(entries.length).toBe(1);
      expect(entries[0].invoiceId).toBe(invoiceId);
      expect(entries[0].supplierPan).toBe("AAACG1234F");
      expect(entries[0].grossAmount).toBe(100000);
      expect(entries[0].tdsAmount).toBe(2000);
      expect(entries[0].netPayableAmount).toBe(98000);
      expect(entries[0].isSection206AAApplied).toBe(false);
    });

    it("enforces Section 206AA 20% rate when supplier has no PAN", async () => {
      // Create supplier without PAN
      const noPanSupplier = await prisma.supplier.create({
        data: {
          organizationId: orgId,
          supplierCode: "SUP-NO-PAN",
          legalName: "No PAN Contractor",
          displayName: "No PAN Contractor",
          country: "IN",
          currency: "INR",
        },
      });

      const invNoPan = await prisma.invoice.create({
        data: {
          organizationId: orgId,
          supplierId: noPanSupplier.id,
          invoiceNumber: "INV-NO-PAN-01",
          currency: "INR",
          totalAmount: 50000,
          workflowState: "SCHEDULED",
          status: "SCHEDULED",
        },
      });
      await prisma.workflowInstance.create({
        data: { invoiceId: invNoPan.id, currentState: "SCHEDULED" },
      });

      const payment = await schedulePayment(orgId, {
        invoiceId: invNoPan.id,
        amount: 50000,
        scheduledDate: "2026-06-01",
        applyTds: true,
        tdsSectionCode: "194C",
      });

      // Gross ₹50,000 - 20% Sec 206AA (₹10,000) = Net ₹40,000
      expect(Number(payment.amount)).toBe(40000);
      expect(payment.notes).toContain("20% under Sec 194C");

      const entries = tdsLedger.getEntries(orgId, { sectionCode: "194C" });
      const noPanEntry = entries.find((e) => e.invoiceId === invNoPan.id);
      expect(noPanEntry).toBeDefined();
      expect(noPanEntry?.tdsRatePercent).toBe(20.0);
      expect(noPanEntry?.tdsAmount).toBe(10000);
      expect(noPanEntry?.netPayableAmount).toBe(40000);
      expect(noPanEntry?.isSection206AAApplied).toBe(true);
    });
  });

  describe("T-502: MSME Compliance Projection & Statutory Due Date Capping", () => {
    it("caps statutory due date at 45 days despite 60-day contractual terms", async () => {
      const invoice = await getInvoice(orgId, invoiceId);

      expect(invoice.msmeCompliance).toBeDefined();
      expect(invoice.msmeCompliance?.isMsmeProtected).toBe(true);
      expect(invoice.msmeCompliance?.msmeCategory).toBe("MICRO");
      expect(invoice.msmeCompliance?.isCappedByMsmeLaw).toBe(true);
      expect(invoice.msmeCompliance?.statutoryMaxDays).toBe(45);

      // Invoice date 2026-05-01 + 45 days = 2026-06-15
      expect(invoice.msmeCompliance?.statutoryDueDate).toBe("2026-06-15");
    });
  });
});
