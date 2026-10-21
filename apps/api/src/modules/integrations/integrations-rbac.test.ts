import { describe, expect, it } from "vitest";
import express, { Request, Response, NextFunction } from "express";
import { integrationRoutes } from "./routes";
import { invoiceRoutes } from "../invoices/routes";
import { signAccessToken } from "../../lib/jwt";

function createTestApp(router: express.Router) {
  const app = express();
  app.use(express.json());
  app.use("/test", router);
  // Error handler adhering to ApiError
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.status || 500).json({ error: err.message, status: err.status });
  });
  return app;
}

function dispatch(app: express.Express, method: string, path: string, role: string, body?: any): Promise<{ status: number; body: any }> {
  const token = signAccessToken({
    userId: "test-user-1",
    organizationId: "org-test-1",
    role,
  });

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
            Authorization: `Bearer ${token}`,
            ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          },
        },
        (res: any) => {
          let data = "";
          res.on("data", (chunk: any) => (data += chunk));
          res.on("end", () => {
            server.close();
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );
      if (payload) req.write(payload);
      req.end();
    });
  });
}

describe("Integrations & Invoice Extraction RBAC Protection (ACT-P0-11 & Extraction Guard)", () => {
  const appIntegrations = createTestApp(integrationRoutes);
  const appInvoices = createTestApp(invoiceRoutes);

  it("blocks non-ADMINISTRATOR (FINANCE_EXECUTIVE) from POST /byok/test with 403 Forbidden", async () => {
    const res = await dispatch(appIntegrations, "POST", "/test/byok/test", "FINANCE_EXECUTIVE", { provider: "GEMINI", apiKey: "test" });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("You do not have permission");
  });

  it("blocks non-ADMINISTRATOR (FINANCE_MANAGER) from POST /byodb/test with 403 Forbidden", async () => {
    const res = await dispatch(appIntegrations, "POST", "/test/byodb/test", "FINANCE_MANAGER", { connectionUrl: "postgresql://..." });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("You do not have permission");
  });

  it("blocks non-ADMINISTRATOR (APPROVER) from POST /erp/test with 403 Forbidden", async () => {
    const res = await dispatch(appIntegrations, "POST", "/test/erp/test", "APPROVER", { provider: "tally" });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("You do not have permission");
  });

  it("blocks non-ADMINISTRATOR (FINANCE_EXECUTIVE) from POST /erp/sync-now with 403 Forbidden", async () => {
    const res = await dispatch(appIntegrations, "POST", "/test/erp/sync-now", "FINANCE_EXECUTIVE", {});
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("You do not have permission");
  });

  it("blocks non-ADMINISTRATOR (FINANCE_MANAGER) from POST /payment-gateway/test with 403 Forbidden", async () => {
    const res = await dispatch(appIntegrations, "POST", "/test/payment-gateway/test", "FINANCE_MANAGER", { provider: "RAZORPAYX" });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("You do not have permission");
  });

  it("blocks READ_ONLY and APPROVER from GET /status with 403 Forbidden", async () => {
    const res = await dispatch(appIntegrations, "GET", "/test/status", "READ_ONLY");
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("You do not have permission");

    const resApprover = await dispatch(appIntegrations, "GET", "/test/status", "APPROVER");
    expect(resApprover.status).toBe(403);
    expect(resApprover.body.error).toContain("You do not have permission");
  });

  it("blocks READ_ONLY and APPROVER from POST /extract with 403 Forbidden", async () => {
    const res = await dispatch(appInvoices, "POST", "/test/extract", "READ_ONLY");
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("You do not have permission");

    const resApprover = await dispatch(appInvoices, "POST", "/test/extract", "APPROVER");
    expect(resApprover.status).toBe(403);
    expect(resApprover.body.error).toContain("You do not have permission");
  });

  it("allows ADMINISTRATOR to access integrations routes", async () => {
    const res = await dispatch(appIntegrations, "GET", "/test/status", "ADMINISTRATOR");
    // Status is 200 (or if db mocks needed, not 403 Forbidden)
    expect(res.status).not.toBe(403);
  });
});
