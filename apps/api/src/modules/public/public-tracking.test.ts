import { describe, expect, it, beforeAll, afterAll } from "vitest";
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import { prisma } from "../../config/database";
import { publicRoutes } from "./routes";
import { invoiceRoutes } from "../invoices/routes";
import { signAccessToken } from "../../lib/jwt";
import { hashTrackingToken, generateTrackingToken, encryptTrackingToken } from "../../lib/crypto";
import { findInvoiceByPublicTrackingHash } from "../invoices/repository";
import { runWithEngineBypass } from "../../config/tenant-guard";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/public", publicRoutes);
  app.use("/invoices", invoiceRoutes);
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.status || 500).json({ error: err.message, status: err.status });
  });
  return app;
}

function dispatch(app: express.Express, method: string, path: string, headers: Record<string, string> = {}, body?: any): Promise<{ status: number; headers: Record<string, any>; body: any }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address() as any;
      const port = addr.port;
      const payload = body ? JSON.stringify(body) : undefined;

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method,
          headers: {
            "Content-Type": "application/json",
            ...headers,
            ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          },
        },
        (res: any) => {
          let data = "";
          res.on("data", (chunk: any) => (data += chunk));
          res.on("end", () => {
            server.close();
            try {
              resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, headers: res.headers, body: data });
            }
          });
        }
      );
      if (payload) req.write(payload);
      req.end();
    });
  });
}

describe("Public Invoice Tracking Hardening (ACT-P0-01)", () => {
  const app = createTestApp();
  const orgId = "org-track-test";
  let invoiceId: string;
  let rawToken: string;
  let expiredToken: string;
  let expiredInvoiceId: string;

  beforeAll(async () => {
    await prisma.organization.upsert({
      where: { id: orgId },
      update: {},
      create: {
        id: orgId,
        name: "Tracking Test Org",
      },
    });

    rawToken = generateTrackingToken();
    const tokenHash = hashTrackingToken(rawToken);
    const encryptedToken = encryptTrackingToken(rawToken, "v1");

    const inv = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber: "INV-TRACK-001",
        totalAmount: 15000,
        currency: "INR",
        status: "RECEIVED",
        workflowState: "RECEIVED",
        trackingTokenHash: tokenHash,
        trackingTokenEncrypted: encryptedToken,
        trackingTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        dueDate: new Date(),
        invoiceDate: new Date(),
      },
    });
    invoiceId = inv.id;

    expiredToken = generateTrackingToken();
    const expiredHash = hashTrackingToken(expiredToken);
    const expiredEncrypted = encryptTrackingToken(expiredToken, "v1");

    const expInv = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber: "INV-TRACK-EXPIRED",
        totalAmount: 20000,
        currency: "INR",
        status: "RECEIVED",
        workflowState: "RECEIVED",
        trackingTokenHash: expiredHash,
        trackingTokenEncrypted: expiredEncrypted,
        trackingTokenExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        dueDate: new Date(),
        invoiceDate: new Date(),
      },
    });
    expiredInvoiceId = expInv.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
    await prisma.invoice.deleteMany({ where: { organizationId: orgId, id: { in: [invoiceId, expiredInvoiceId] } } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
  });

  it("resolves invoice status by secure token hash and returns security headers (no-store, no-referrer)", async () => {
    const res = await dispatch(app, "GET", `/public/invoices/track/${rawToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.invoiceNumber).toBe("INV-TRACK-001");
    expect(res.body.data.amount).toBe(15000);
    expect(res.body.data.publicStatus).toBe("Received");

    // Security headers required by ACT-P0-01
    expect(res.headers["cache-control"]).toContain("no-store");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
  });

  it("rejects lookup by raw invoiceNumber or UUID guessing with 404 (prevents enumeration)", async () => {
    // Attempting to look up directly by invoiceNumber
    const resNumber = await dispatch(app, "GET", `/public/invoices/track/INV-TRACK-001`);
    expect(resNumber.status).toBe(404);

    // Attempting to look up directly by UUID
    const resId = await dispatch(app, "GET", `/public/invoices/track/${invoiceId}`);
    expect(resId.status).toBe(404);

    // Attempting legacy fallback
    const resLegacy = await dispatch(app, "GET", `/public/invoices/track/INV-2026-1007`);
    expect(resLegacy.status).toBe(404);
  });

  it("returns 410 Gone when tracking token has expired", async () => {
    const res = await dispatch(app, "GET", `/public/invoices/track/${expiredToken}`);
    expect(res.status).toBe(410);
    expect(res.body.error).toContain("Tracking link expired");
  });

  it("findInvoiceByPublicTrackingHash executes unscoped lookup without tenant guard error", async () => {
    const tokenHash = hashTrackingToken(rawToken);
    const invoice = await findInvoiceByPublicTrackingHash(tokenHash);
    expect(invoice).toBeDefined();
    expect(invoice?.id).toBe(invoiceId);
  });

  it("returns web URL (<APP_BASE_URL>/track/<token>) for operator tracking endpoint", async () => {
    const managerToken = signAccessToken({
      userId: "manager-user",
      organizationId: orgId,
      role: "FINANCE_MANAGER",
    });

    const res = await dispatch(
      app,
      "GET",
      `/invoices/${invoiceId}/tracking`,
      { Authorization: `Bearer ${managerToken}` }
    );
    expect(res.status).toBe(200);
    expect(res.body.data.trackingToken).toBeDefined();
    expect(res.body.data.trackingUrl).toMatch(/^http:\/\/.*\/track\/[a-f0-9]{64}$/);
    expect(res.body.data.trackingUrl).not.toContain("/public/invoices/track");
  });

  it("enforces RBAC on regenerate: allows ADMINISTRATOR and FINANCE_MANAGER, refuses FINANCE_EXECUTIVE", async () => {
    const execToken = signAccessToken({
      userId: "exec-user",
      organizationId: orgId,
      role: "FINANCE_EXECUTIVE",
    });

    const resExec = await dispatch(
      app,
      "POST",
      `/invoices/${invoiceId}/tracking/regenerate`,
      { Authorization: `Bearer ${execToken}` }
    );
    expect(resExec.status).toBe(403);

    const fmToken = signAccessToken({
      userId: "fm-user",
      organizationId: orgId,
      role: "FINANCE_MANAGER",
    });

    const resFm = await dispatch(
      app,
      "POST",
      `/invoices/${invoiceId}/tracking/regenerate`,
      { Authorization: `Bearer ${fmToken}` }
    );
    expect(resFm.status).toBe(200);
    expect(resFm.body.data.trackingUrl).toMatch(/^http:\/\/.*\/track\/[a-f0-9]{64}$/);

    // Verify audit log written
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        organizationId: orgId,
        entityId: invoiceId,
        action: "TRACKING_LINK_REGENERATED",
      },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog?.userId).toBe("fm-user");
  });

  it("computes 90 days expiry for non-paid invoice, and 270 days (90+180) for PAID invoice", async () => {
    const adminToken = signAccessToken({
      userId: "admin-user",
      organizationId: orgId,
      role: "ADMINISTRATOR",
    });

    // 1. Unpaid invoice regenerate -> 90 days
    const resUnpaid = await dispatch(
      app,
      "POST",
      `/invoices/${invoiceId}/tracking/regenerate`,
      { Authorization: `Bearer ${adminToken}` }
    );
    expect(resUnpaid.status).toBe(200);
    const expUnpaid = new Date(resUnpaid.body.data.expiresAt).getTime();
    const diffDaysUnpaid = Math.round((expUnpaid - Date.now()) / (24 * 60 * 60 * 1000));
    expect(diffDaysUnpaid).toBeGreaterThanOrEqual(89);
    expect(diffDaysUnpaid).toBeLessThanOrEqual(91);

    // 2. Mark invoice PAID and regenerate -> 270 days
    await runWithEngineBypass(async () => {
      await prisma.invoice.update({
        where: { id_organizationId: { id: invoiceId, organizationId: orgId } },
        data: { status: "PAID" },
      });
    });

    const resPaid = await dispatch(
      app,
      "POST",
      `/invoices/${invoiceId}/tracking/regenerate`,
      { Authorization: `Bearer ${adminToken}` }
    );
    expect(resPaid.status).toBe(200);
    const expPaid = new Date(resPaid.body.data.expiresAt).getTime();
    const diffDaysPaid = Math.round((expPaid - Date.now()) / (24 * 60 * 60 * 1000));
    expect(diffDaysPaid).toBeGreaterThanOrEqual(269);
    expect(diffDaysPaid).toBeLessThanOrEqual(271);

    // Assert that audit log records TRACKING_LINK_REGENERATED
    const auditRow = await prisma.auditLog.findFirst({
      where: {
        organizationId: orgId,
        entityId: invoiceId,
        action: "TRACKING_LINK_REGENERATED",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(auditRow).not.toBeNull();
    expect(auditRow?.action).toBe("TRACKING_LINK_REGENERATED");
  });

  it("Item 5f: tenant-guard exemption applies ONLY to exact { trackingTokenHash } in tracking context; any other query throws", async () => {
    const { runWithTrackingLookupBypass } = await import("../../config/tenant-guard");
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      // 1. Outside tracking context, query without orgId throws
      await expect(
        prisma.invoice.findFirst({ where: { invoiceNumber: "INV-TRACK-001" } })
      ).rejects.toThrow(/AGENTS\.md Rule 7: All queries on Invoice must include organizationId/);

      // 2. Inside tracking context, query with EXACT { trackingTokenHash } succeeds
      const tokenHash = hashTrackingToken(rawToken);
      const validQuery = await runWithTrackingLookupBypass(async () => {
        return prisma.invoice.findFirst({
          where: { trackingTokenHash: tokenHash },
        });
      });
      // Should not throw (can be found or null, but tenant guard permits it)
      expect(validQuery !== undefined).toBe(true);

      // 3. Inside tracking context, any query with OTHER fields (e.g. { trackingTokenHash, status }) throws
      await expect(
        runWithTrackingLookupBypass(async () => {
          return prisma.invoice.findFirst({
            where: { trackingTokenHash: tokenHash, status: "RECEIVED" },
          });
        })
      ).rejects.toThrow(/AGENTS\.md Rule 7/);

      // 4. Inside tracking context, an unscoped query with a different where field throws
      await expect(
        runWithTrackingLookupBypass(async () => {
          return prisma.invoice.findFirst({
            where: { invoiceNumber: "INV-TRACK-001" },
          });
        })
      ).rejects.toThrow(/AGENTS\.md Rule 7/);

      // 5. Inside tracking context, a findMany query throws
      await expect(
        runWithTrackingLookupBypass(async () => {
          return prisma.invoice.findMany();
        })
      ).rejects.toThrow(/AGENTS\.md Rule 7/);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });
});
