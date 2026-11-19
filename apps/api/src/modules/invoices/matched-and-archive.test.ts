import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "../../config/database";
import { applyTransition } from "../../workflow/engine";
import { transitionInvoice, archiveInvoice, archiveEligibleInvoices } from "./service";

describe("T-306: MATCHED State Wiring & ARCHIVE_COMPLETE Triggers", () => {
  const orgId = "org-test-matched-archive";
  let adminId: string;
  let execId: string;

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
    await prisma.document.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.invoiceLine.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.notification.deleteMany({ where: { organizationId: orgId } });
    await prisma.payment.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });

    await prisma.organization.create({
      data: {
        id: orgId,
        name: "Test Matched Archive Org",
        defaultCurrency: "INR",
        country: "IN",
      },
    });

    const admin = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "admin@archive.test",
        passwordHash: "dummyhash",
        role: "ADMINISTRATOR",
        fullName: "Admin User",
      },
    });
    adminId = admin.id;

    const exec = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "exec@archive.test",
        passwordHash: "dummyhash",
        role: "FINANCE_EXECUTIVE",
        fullName: "Executive User",
      },
    });
    execId = exec.id;
  });

  async function createInvoiceWithState(wfState: string, status: string, invNum: string) {
    const inv = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber: invNum,
        currency: "INR",
        totalAmount: 15000,
        subtotalAmount: 15000,
        taxAmount: 0,
        workflowState: wfState as any,
        status: status as any,
      },
    });
    await prisma.workflowInstance.create({
      data: {
        invoiceId: inv.id,
        currentState: wfState as any,
      },
    });
    return inv;
  }

  describe("MATCHED State Engine Wiring", () => {
    it("transitions from MATCHING to MATCHED on MATCHING_SUCCESS", async () => {
      const inv = await createInvoiceWithState("MATCHING", "PROCESSING", "INV-MATCH-01");

      const res = await applyTransition({
        invoiceId: inv.id,
        organizationId: orgId,
        event: "MATCHING_SUCCESS",
        triggeredBy: adminId,
      });

      expect(res.workflowInstance.currentState).toBe("MATCHED");
      expect(res.invoice.status).toBe("PROCESSING");
      expect(res.invoice.workflowState).toBe("MATCHED");
    });

    it("transitions from MATCHED to WAITING_APPROVAL via APPROVAL_REQUEST", async () => {
      const inv = await createInvoiceWithState("MATCHED", "PROCESSING", "INV-MATCH-02");

      const res = await applyTransition({
        invoiceId: inv.id,
        organizationId: orgId,
        event: "APPROVAL_REQUEST",
        triggeredBy: adminId,
      });

      expect(res.workflowInstance.currentState).toBe("WAITING_APPROVAL");
      expect(res.invoice.status).toBe("PENDING_APPROVAL");
      expect(res.invoice.workflowState).toBe("WAITING_APPROVAL");
    });

    it("SUBMIT_APPROVAL action routes matched invoice to WAITING_APPROVAL queue", async () => {
      const inv = await createInvoiceWithState("MATCHED", "PROCESSING", "INV-MATCH-03");

      const updated = await transitionInvoice(
        orgId,
        inv.id,
        "SUBMIT_APPROVAL",
        adminId,
        undefined,
        "ADMINISTRATOR"
      );

      expect(updated.workflowState).toBe("WAITING_APPROVAL");
      expect(updated.status).toBe("PENDING_APPROVAL");
    });
  });

  describe("ARCHIVE_COMPLETE Trigger & Endpoints", () => {
    it("archives invoice from ERP_SYNC state with full audit logging", async () => {
      const inv = await createInvoiceWithState("ERP_SYNC", "SYNCED", "INV-ARCH-01");

      const archived = await archiveInvoice(orgId, inv.id, adminId, "Quarterly compliance close");

      expect(archived.workflowState).toBe("ARCHIVED");
      expect(archived.status).toBe("ARCHIVED");

      // Verify audit log entries
      const auditLogs = await prisma.auditLog.findMany({
        where: { organizationId: orgId, entityId: inv.id },
      });
      const archiveLog = auditLogs.find((l) => l.action === "INVOICE_ARCHIVED");
      expect(archiveLog).toBeDefined();
      expect(archiveLog?.userId).toBe(adminId);

      const wfLog = auditLogs.find((l) => l.action === "WORKFLOW_TRANSITION");
      expect(wfLog).toBeDefined();
      expect((wfLog?.afterData as any)?.state).toBe("ARCHIVED");
    });

    it("archives invoice from settled PAID state without requiring ERP", async () => {
      const inv = await createInvoiceWithState("PAID", "PAID", "INV-ARCH-02");

      const archived = await archiveInvoice(orgId, inv.id, adminId, "Manual settlement archive");

      expect(archived.workflowState).toBe("ARCHIVED");
      expect(archived.status).toBe("ARCHIVED");
    });

    it("blocks archiving invoices in non-terminal states (e.g. WAITING_APPROVAL)", async () => {
      const inv = await createInvoiceWithState("WAITING_APPROVAL", "PENDING_APPROVAL", "INV-ARCH-03");

      await expect(
        archiveInvoice(orgId, inv.id, adminId)
      ).rejects.toThrow(/cannot be archived/i);
    });

    it("enforces RBAC: blocks FINANCE_EXECUTIVE from archiving via /transitions", async () => {
      const inv = await createInvoiceWithState("ERP_SYNC", "SYNCED", "INV-ARCH-04");

      await expect(
        transitionInvoice(orgId, inv.id, "ARCHIVE", execId, undefined, "FINANCE_EXECUTIVE")
      ).rejects.toThrow(/not authorized to archive/i);
    });

    it("allows ADMINISTRATOR to archive via /transitions action ARCHIVE", async () => {
      const inv = await createInvoiceWithState("ERP_SYNC", "SYNCED", "INV-ARCH-05");

      const archived = await transitionInvoice(
        orgId,
        inv.id,
        "ARCHIVE",
        adminId,
        "Bulk archive action",
        "ADMINISTRATOR"
      );

      expect(archived.workflowState).toBe("ARCHIVED");
      expect(archived.status).toBe("ARCHIVED");
    });
  });

  describe("Scheduled Automated Archive (archiveEligibleInvoices)", () => {
    it("archives only eligible invoices older than retention period", async () => {
      // Old ERP_SYNC invoice (40 days ago)
      const oldInv = await createInvoiceWithState("ERP_SYNC", "SYNCED", "INV-OLD-SYNC");
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      await prisma.invoice.update({
        where: { id_organizationId: { id: oldInv.id, organizationId: orgId } },
        data: { updatedAt: fortyDaysAgo },
      });

      // Recent ERP_SYNC invoice (5 days ago)
      const recentInv = await createInvoiceWithState("ERP_SYNC", "SYNCED", "INV-RECENT-SYNC");
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      await prisma.invoice.update({
        where: { id_organizationId: { id: recentInv.id, organizationId: orgId } },
        data: { updatedAt: fiveDaysAgo },
      });

      const result = await archiveEligibleInvoices(orgId, 30);

      expect(result.archivedCount).toBe(1);
      expect(result.invoiceIds).toContain(oldInv.id);
      expect(result.invoiceIds).not.toContain(recentInv.id);

      const checkOld = await prisma.invoice.findUnique({
        where: { id_organizationId: { id: oldInv.id, organizationId: orgId } },
      });
      expect(checkOld?.workflowState).toBe("ARCHIVED");
      expect(checkOld?.status).toBe("ARCHIVED");

      const checkRecent = await prisma.invoice.findUnique({
        where: { id_organizationId: { id: recentInv.id, organizationId: orgId } },
      });
      expect(checkRecent?.workflowState).toBe("ERP_SYNC");
    });
  });
});
