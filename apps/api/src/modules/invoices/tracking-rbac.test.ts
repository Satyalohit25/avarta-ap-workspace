import { describe, expect, it, beforeEach, afterAll } from "vitest";
import http from "http";
import { createApp } from "../../app/app";
import { prisma } from "../../config/database";
import { signAccessToken } from "../../lib/jwt";
import { createInvoice } from "./service";

function doRequest(
  port: number,
  method: string,
  path: string,
  token: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          let body = text;
          try {
            body = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

describe("Tracking Route RBAC & Idempotent Read Enforcement", () => {
  const orgId = "org-tracking-rbac-test";
  let server: http.Server;
  let port: number;
  let invoiceId: string;

  beforeEach(async () => {
    const app = createApp();
    server = app.listen(0);
    port = (server.address() as any).port;

    await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
    await prisma.invoiceLine.deleteMany({ where: { invoice: { organizationId: orgId } } });
    await prisma.workflowTransition.deleteMany({
      where: { workflowInstance: { invoice: { organizationId: orgId } } },
    });
    await prisma.workflowInstance.deleteMany({ where: { invoice: { organizationId: orgId } } });
    await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
    await prisma.supplier.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });

    await prisma.organization.create({
      data: { id: orgId, name: "Tracking RBAC Org", defaultCurrency: "INR", country: "IN" },
    });

    for (const r of ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE", "APPROVER", "READ_ONLY"] as const) {
      await prisma.user.create({
        data: {
          id: `user-${r.toLowerCase()}`,
          organizationId: orgId,
          email: `${r.toLowerCase()}@rbac.test`,
          fullName: `${r} User`,
          role: r,
          passwordHash: "dummy",
          status: "ACTIVE",
        },
      });
    }

    const supplier = await prisma.supplier.create({
      data: {
        organizationId: orgId,
        supplierCode: "SUP-TRACK-RBAC",
        legalName: "Tracking RBAC Vendor Legal",
        displayName: "Tracking RBAC Vendor",
        status: "ACTIVE",
      },
    });

    const inv = await createInvoice({
      organizationId: orgId,
      invoiceNumber: `INV-TRK-${Date.now().toString().slice(-6)}`,
      supplierId: supplier.id,
      totalAmount: 15000,
      currency: "INR",
    });
    invoiceId = inv.id;
  });

  afterAll(() => {
    if (server) server.close();
  });

  it("permits ADMINISTRATOR, FINANCE_MANAGER, and FINANCE_EXECUTIVE to fetch tracking link", async () => {
    for (const role of ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"] as const) {
      const token = signAccessToken({
        userId: `user-${role.toLowerCase()}`,
        organizationId: orgId,
        role,
        tokenVersion: 0,
      });

      const res = await doRequest(port, "GET", `/api/v1/invoices/${invoiceId}/tracking`, token);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.trackingToken).toBeDefined();
      expect(res.body.data.trackingUrl).toContain("/track/");
    }
  });

  it("strictly forbids APPROVER and READ_ONLY from accessing GET /invoices/:id/tracking (returns 403)", async () => {
    for (const role of ["APPROVER", "READ_ONLY"] as const) {
      const token = signAccessToken({
        userId: `user-${role.toLowerCase()}`,
        organizationId: orgId,
        role,
        tokenVersion: 0,
      });

      const res = await doRequest(port, "GET", `/api/v1/invoices/${invoiceId}/tracking`, token);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    }
  });

  it("GET /invoices/:id/tracking is a pure read without mutating token or timestamp", async () => {
    const adminToken = signAccessToken({
      userId: "user-administrator",
      organizationId: orgId,
      role: "ADMINISTRATOR",
      tokenVersion: 0,
    });

    const before = await prisma.invoice.findUnique({
      where: { id_organizationId: { id: invoiceId, organizationId: orgId } },
    });

    const res1 = await doRequest(port, "GET", `/api/v1/invoices/${invoiceId}/tracking`, adminToken);
    expect(res1.status).toBe(200);

    const after1 = await prisma.invoice.findUnique({
      where: { id_organizationId: { id: invoiceId, organizationId: orgId } },
    });

    expect(after1?.updatedAt.getTime()).toBe(before?.updatedAt.getTime());
    expect(after1?.trackingTokenHash).toBe(before?.trackingTokenHash);
  });
});
