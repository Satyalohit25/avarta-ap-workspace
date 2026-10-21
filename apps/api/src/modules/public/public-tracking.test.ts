import { describe, expect, it, beforeAll, afterAll } from "vitest";
import express, { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";
import { publicRoutes } from "./routes";
import { invoiceRoutes } from "../invoices/routes";
import { signAccessToken } from "../../lib/jwt";
import { hashTrackingToken, generateTrackingToken, encryptTrackingToken } from "../../lib/crypto";
import { findInvoiceByPublicTrackingHash } from "../invoices/repository";
import { applyTransition } from "../../workflow/engine";

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

      const req = require("http").request(
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
    await prisma.invoice.deleteMany({ where: { id: { in: [invoiceId, expiredInvoiceId] } } });
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

  it("allows regenerating tracking token and extends expiry", async () => {
    const adminToken = signAccessToken({
      userId: "admin-user",
      organizationId: orgId,
      role: "ADMINISTRATOR",
    });

    const res = await dispatch(
      app,
      "POST",
      `/invoices/${invoiceId}/tracking/regenerate`,
      { Authorization: `Bearer ${adminToken}` }
    );
    expect(res.status).toBe(200);
    expect(res.body.data.trackingToken).toBeDefined();
    expect(res.body.data.trackingToken).not.toBe(rawToken);

    // Old token should now fail
    const oldRes = await dispatch(app, "GET", `/public/invoices/track/${rawToken}`);
    expect(oldRes.status).toBe(404);

    // New token should work
    const newRes = await dispatch(app, "GET", `/public/invoices/track/${res.body.data.trackingToken}`);
    expect(newRes.status).toBe(200);
  });
});
