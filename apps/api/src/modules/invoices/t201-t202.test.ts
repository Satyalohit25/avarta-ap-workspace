import { describe, expect, it, beforeEach, afterAll } from "vitest";
import http from "http";
import { createApp } from "../../app/app";
import { prisma } from "../../config/database";
import { signAccessToken } from "../../lib/jwt";
import { createInvoice } from "./service";
import { resolveException } from "../exceptions/service";

function doRequest(
  port: number,
  method: string,
  path: string,
  token: string,
  body?: any
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          let parsed = text;
          try {
            parsed = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode || 0, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe("T-201 and T-202 Suite: State Persistence and Rejection Recovery", () => {
  const orgId = "org-t201-t202-test";
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    const app = createApp();
    server = app.listen(0);
    port = (server.address() as any).port;

    await prisma.notification.deleteMany({ where: { organizationId: orgId } });
    await prisma.payment.deleteMany({ where: { organizationId: orgId } });
    await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
    await prisma.exception.deleteMany({ where: { organizationId: orgId } });
    await prisma.approval.deleteMany({ where: { invoice: { organizationId: orgId } } });
    await prisma.invoiceLine.deleteMany({ where: { invoice: { organizationId: orgId } } });
    await prisma.workflowTransition.deleteMany({
      where: { workflowInstance: { invoice: { organizationId: orgId } } },
    });
    await prisma.workflowInstance.deleteMany({ where: { invoice: { organizationId: orgId } } });
    await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });

    await prisma.organization.create({
      data: {
        id: orgId,
        name: "Test T201 Org",
        legalName: "Test T201 Org Ltd",
        country: "IN",
        defaultCurrency: "INR",
        settings: { priceTolerancePercent: 5.0 },
      },
    });
  });

  afterAll(async () => {
    if (server) server.close();
  });

  describe("T-201: Persistent Controls & Audit Trail", () => {
    it("persists user profile fullName and creates USER_PROFILE_UPDATED audit log", async () => {
      const user = await prisma.user.create({
        data: {
          id: "usr-profile-test",
          organizationId: orgId,
          email: "user-profile@test.com",
          fullName: "Original Name",
          role: "FINANCE_EXECUTIVE",
          passwordHash: "hashed",
        },
      });

      const token = signAccessToken({
        userId: user.id,
        organizationId: orgId,
        role: "FINANCE_EXECUTIVE",
      });

      const res = await doRequest(port, "PATCH", "/api/v1/auth/me", token, {
        fullName: "Updated Name",
      });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe("Updated Name");

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.fullName).toBe("Updated Name");

      const audit = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgId,
          entityId: user.id,
          action: "USER_PROFILE_UPDATED",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.beforeData).toEqual({ fullName: "Original Name" });
      expect(audit?.afterData).toEqual({ fullName: "Updated Name" });
    });

    it("enforces permissions and length on line variance override and writes audit log", async () => {
      const execUser = await prisma.user.create({
        data: {
          id: "usr-exec-t201",
          organizationId: orgId,
          email: "exec@test.com",
          fullName: "Finance Exec",
          role: "FINANCE_EXECUTIVE",
          passwordHash: "hashed",
        },
      });

      const mgrUser = await prisma.user.create({
        data: {
          id: "usr-mgr-t201",
          organizationId: orgId,
          email: "mgr@test.com",
          fullName: "Finance Manager",
          role: "FINANCE_MANAGER",
          passwordHash: "hashed",
        },
      });

      const invoice = await createInvoice({
        organizationId: orgId,
        invoiceNumber: "INV-T201-LINE",
        currency: "INR",
        subtotalAmount: 1000,
        taxAmount: 180,
        totalAmount: 1180,
        lines: [
          {
            lineNumber: 1,
            description: "Server Rack",
            quantity: 1,
            unitPrice: 1000,
            lineAmount: 1000,
          },
        ],
      });

      const line = await prisma.invoiceLine.findFirst({
        where: { invoiceId: invoice.id, invoice: { organizationId: orgId } },
      });
      expect(line).toBeDefined();

      const execToken = signAccessToken({
        userId: execUser.id,
        organizationId: orgId,
        role: "FINANCE_EXECUTIVE",
      });

      // Role check: FINANCE_EXECUTIVE forbidden to override variance
      const forbiddenRes = await doRequest(
        port,
        "PATCH",
        `/api/v1/invoices/${invoice.id}/lines/${line!.id}/override`,
        execToken,
        {
          overrideAccepted: true,
          reason: "Sufficient length override justification",
        }
      );
      expect(forbiddenRes.status).toBe(403);

      const mgrToken = signAccessToken({
        userId: mgrUser.id,
        organizationId: orgId,
        role: "FINANCE_MANAGER",
      });

      // Length check: min 10 chars
      const shortRes = await doRequest(
        port,
        "PATCH",
        `/api/v1/invoices/${invoice.id}/lines/${line!.id}/override`,
        mgrToken,
        {
          overrideAccepted: true,
          reason: "Too short",
        }
      );
      expect(shortRes.status).toBe(400);

      // Successful override
      const okRes = await doRequest(
        port,
        "PATCH",
        `/api/v1/invoices/${invoice.id}/lines/${line!.id}/override`,
        mgrToken,
        {
          overrideAccepted: true,
          reason: "Authorized variance tolerance signed off per department AP policy.",
        }
      );
      expect(okRes.status).toBe(200);

      const dbLine = await prisma.invoiceLine.findFirst({
        where: { id: line!.id, invoice: { organizationId: orgId } },
      });
      expect(dbLine?.overrideAccepted).toBe(true);
      expect(dbLine?.overrideUserId).toBe(mgrUser.id);
      expect(dbLine?.overrideReason).toBe(
        "Authorized variance tolerance signed off per department AP policy."
      );

      const audit = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgId,
          entityId: line!.id,
          action: "LINE_VARIANCE_OVERRIDDEN",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(mgrUser.id);
    });

    it("persists line match status and writes audit log", async () => {
      const execUser = await prisma.user.create({
        data: {
          id: "usr-exec-match",
          organizationId: orgId,
          email: "exec-match@test.com",
          fullName: "Finance Exec Match",
          role: "FINANCE_EXECUTIVE",
          passwordHash: "hashed",
        },
      });

      const invoice = await createInvoice({
        organizationId: orgId,
        invoiceNumber: "INV-T201-MATCH",
        currency: "INR",
        subtotalAmount: 500,
        taxAmount: 90,
        totalAmount: 590,
        lines: [
          {
            lineNumber: 1,
            description: "Printer Toner",
            quantity: 2,
            unitPrice: 250,
            lineAmount: 500,
          },
        ],
      });

      const line = await prisma.invoiceLine.findFirst({
        where: { invoiceId: invoice.id, invoice: { organizationId: orgId } },
      });

      const execToken = signAccessToken({
        userId: execUser.id,
        organizationId: orgId,
        role: "FINANCE_EXECUTIVE",
      });

      const res = await doRequest(
        port,
        "PATCH",
        `/api/v1/invoices/${invoice.id}/lines/${line!.id}/match-status`,
        execToken,
        {
          matchStatus: "PRICE_VARIANCE",
        }
      );

      expect(res.status).toBe(200);

      const dbLine = await prisma.invoiceLine.findFirst({
        where: { id: line!.id, invoice: { organizationId: orgId } },
      });
      expect(dbLine?.matchStatus).toBe("PRICE_VARIANCE");

      const audit = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgId,
          entityId: line!.id,
          action: "LINE_MATCH_STATUS_UPDATED",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.afterData).toEqual({
        lineNumber: 1,
        matchStatus: "PRICE_VARIANCE",
      });
    });

    it("persists Decision Hub checklist updates and stores confirmations with approval record", async () => {
      const approver = await prisma.user.create({
        data: {
          id: "usr-appr-decision",
          organizationId: orgId,
          email: "appr-decision@test.com",
          fullName: "Approver Decision",
          role: "APPROVER",
          passwordHash: "hashed",
        },
      });

      const invoice = await createInvoice({
        organizationId: orgId,
        invoiceNumber: "INV-T201-DECISION",
        currency: "INR",
        subtotalAmount: 2000,
        taxAmount: 360,
        totalAmount: 2360,
      });

      const token = signAccessToken({
        userId: approver.id,
        organizationId: orgId,
        role: "APPROVER",
      });

      // 1. Direct Decision Hub update
      const checklist = ["supplier_verified", "po_reconciled"];
      const updateRes = await doRequest(
        port,
        "PATCH",
        `/api/v1/invoices/${invoice.id}/decision-hub`,
        token,
        { confirmations: checklist }
      );
      expect(updateRes.status).toBe(200);

      const dbInvoice = await prisma.invoice.findFirst({
        where: { id: invoice.id, organizationId: orgId },
      });
      expect(dbInvoice?.decisionChecklist).toBeDefined();

      const audit = await prisma.auditLog.findFirst({
        where: {
          organizationId: orgId,
          entityId: invoice.id,
          action: "DECISION_HUB_CHECKLIST_UPDATED",
        },
      });
      expect(audit).not.toBeNull();
    });
  });

  describe("T-202: Rejected Invoices Lifecycle & Recovery Flow", () => {
    it("creates an APPROVAL_REJECTED exception on rejection, which can be resolved to return to VALIDATED", async () => {
      const approver = await prisma.user.create({
        data: {
          id: "usr-appr-t202",
          organizationId: orgId,
          email: "appr-t202@test.com",
          fullName: "Approver Reject",
          role: "APPROVER",
          passwordHash: "hashed",
        },
      });

      const invoice = await createInvoice({
        organizationId: orgId,
        invoiceNumber: "INV-T202-REJECT",
        currency: "INR",
        subtotalAmount: 1000,
        taxAmount: 180,
        totalAmount: 1180,
      });

      // Advance through capture & matching into WAITING_APPROVAL
      const { applyTransition } = await import("../../workflow/engine");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });

      const waitingInvoice = await prisma.invoice.findFirst({
        where: { id: invoice.id, organizationId: orgId },
      });
      expect(waitingInvoice?.workflowState).toBe("WAITING_APPROVAL");

      // Seed pending approval
      await prisma.approval.create({
        data: {
          invoiceId: invoice.id,
          approverId: approver.id,
          status: "PENDING",
        },
      });

      const token = signAccessToken({
        userId: approver.id,
        organizationId: orgId,
        role: "APPROVER",
      });

      // 1. Approver rejects invoice
      const rejectRes = await doRequest(
        port,
        "POST",
        `/api/v1/invoices/${invoice.id}/transitions`,
        token,
        {
          action: "REJECT",
          comment: "Discrepancy in billing terms",
        }
      );
      expect(rejectRes.status).toBe(200);

      // Verify invoice moved to VALIDATION_FAILED (projected as EXCEPTION in UI)
      const rejectedInvoice = await prisma.invoice.findFirst({
        where: { id: invoice.id, organizationId: orgId },
      });
      expect(rejectedInvoice?.workflowState).toBe("VALIDATION_FAILED");
      expect(rejectedInvoice?.status).toBe("EXCEPTION");

      // Verify APPROVAL_REJECTED exception was created
      const exception = await prisma.exception.findFirst({
        where: {
          organizationId: orgId,
          invoiceId: invoice.id,
          type: "APPROVAL_REJECTED",
        },
      });
      expect(exception).not.toBeNull();
      expect(exception?.status).toBe("OPEN");
      expect(exception?.description).toBe("Discrepancy in billing terms");

      // 2. Resolve exception
      const resolveResult = await resolveException(
        orgId,
        exception!.id,
        "Vendor submitted corrected terms and credits",
        approver.id
      );
      expect(resolveResult?.status).toBe("RESOLVED");

      // Invoice re-enters workflow at VALIDATED
      const resolvedInvoice = await prisma.invoice.findFirst({
        where: { id: invoice.id, organizationId: orgId },
      });
      expect(resolvedInvoice?.workflowState).toBe("VALIDATED");

      // 3. Re-enter matching & approval
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });

      const reWaitingInvoice = await prisma.invoice.findFirst({
        where: { id: invoice.id, organizationId: orgId },
      });
      expect(reWaitingInvoice?.workflowState).toBe("WAITING_APPROVAL");

      // Re-approve successfully
      await prisma.approval.create({
        data: {
          invoiceId: invoice.id,
          approverId: approver.id,
          status: "PENDING",
        },
      });

      const approveRes = await doRequest(
        port,
        "POST",
        `/api/v1/invoices/${invoice.id}/transitions`,
        token,
        {
          action: "APPROVE",
          comment: "Approved after resolution",
        }
      );
      expect(approveRes.status).toBe(200);

      const approvedInvoice = await prisma.invoice.findFirst({
        where: { id: invoice.id, organizationId: orgId },
      });
      expect(approvedInvoice?.workflowState).toBe("SCHEDULED");
      expect(approvedInvoice?.status).toBe("SCHEDULED");
    });

    it("supports permanent closure ('Reject and close') directly archiving the invoice", async () => {
      const approver = await prisma.user.create({
        data: {
          id: "usr-appr-close",
          organizationId: orgId,
          email: "appr-close@test.com",
          fullName: "Approver Close",
          role: "APPROVER",
          passwordHash: "hashed",
        },
      });

      const invoice = await createInvoice({
        organizationId: orgId,
        invoiceNumber: "INV-T202-CLOSE",
        currency: "INR",
        subtotalAmount: 1000,
        taxAmount: 180,
        totalAmount: 1180,
      });

      const { applyTransition } = await import("../../workflow/engine");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });

      await prisma.approval.create({
        data: {
          invoiceId: invoice.id,
          approverId: approver.id,
          status: "PENDING",
        },
      });

      const token = signAccessToken({
        userId: approver.id,
        organizationId: orgId,
        role: "APPROVER",
      });

      // Reject & close permanently
      const rejectCloseRes = await doRequest(
        port,
        "POST",
        `/api/v1/invoices/${invoice.id}/transitions`,
        token,
        {
          action: "REJECT",
          comment: "Duplicate fraudulent invoice cancelled permanently",
          closePermanently: true,
        }
      );
      expect(rejectCloseRes.status).toBe(200);

      const archivedInvoice = await prisma.invoice.findFirst({
        where: { id: invoice.id, organizationId: orgId },
      });
      expect(archivedInvoice?.workflowState).toBe("ARCHIVED");
      expect(archivedInvoice?.status).toBe("ARCHIVED");
    });
  });
});
