import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetDemoHandler } from "./controller";

describe("Demo Reset Safety Guard (Item 11)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("refuses /demo/reset when running against a non-test database", async () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://postgres:123@localhost:5432/avarta_db?schema=public";
    delete process.env.ALLOW_DEV_DEMO_RESET;

    const req: any = {};
    let statusCode = 0;
    let jsonBody: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (body: any) => {
        jsonBody = body;
        return res;
      },
    };
    const next = vi.fn();

    await resetDemoHandler(req, res, next);

    expect(statusCode).toBe(403);
    expect(jsonBody?.error).toBe("Forbidden");
    expect(jsonBody?.message).toContain("Demo scenario reset is guarded");
  });

  it("refuses /demo/reset permanently in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://postgres:123@localhost:5432/avarta_db?schema=test_suite";

    const req: any = {};
    let statusCode = 0;
    let jsonBody: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (body: any) => {
        jsonBody = body;
        return res;
      },
    };
    const next = vi.fn();

    await resetDemoHandler(req, res, next);

    expect(statusCode).toBe(403);
    expect(jsonBody?.error).toBe("Forbidden");
    expect(jsonBody?.message).toContain("production environment");
  });
});
