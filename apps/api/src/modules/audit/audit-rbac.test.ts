import { describe, expect, it } from "vitest";
import express, { Request, Response, NextFunction } from "express";
import { auditRoutes } from "./routes";
import { signAccessToken } from "../../lib/jwt";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/audit", auditRoutes);
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.status || 500).json({ error: err.message, status: err.status });
  });
  return app;
}

function dispatch(app: express.Express, role: string): Promise<{ status: number; body: any }> {
  const token = signAccessToken({
    userId: "test-user-audit",
    organizationId: "org-test-audit",
    role,
  });

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address() as any;
      const port = addr.port;
      const req = require("http").request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/audit",
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
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
      req.end();
    });
  });
}

describe("Audit Read Access Restriction (ACT-P0-H)", () => {
  const app = createTestApp();

  it("blocks READ_ONLY role from GET /audit with 403 Forbidden", async () => {
    const res = await dispatch(app, "READ_ONLY");
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("You do not have permission");
  });

  it("blocks APPROVER role from GET /audit with 403 Forbidden", async () => {
    const res = await dispatch(app, "APPROVER");
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("You do not have permission");
  });

  it("blocks FINANCE_EXECUTIVE role from GET /audit with 403 Forbidden", async () => {
    const res = await dispatch(app, "FINANCE_EXECUTIVE");
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("You do not have permission");
  });

  it("allows FINANCE_MANAGER role to access GET /audit", async () => {
    const res = await dispatch(app, "FINANCE_MANAGER");
    expect(res.status).not.toBe(403);
  });

  it("allows ADMINISTRATOR role to access GET /audit", async () => {
    const res = await dispatch(app, "ADMINISTRATOR");
    expect(res.status).not.toBe(403);
  });
});
