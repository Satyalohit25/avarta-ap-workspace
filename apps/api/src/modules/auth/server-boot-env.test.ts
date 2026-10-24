import { describe, it, expect } from "vitest";
import { spawnSync } from "child_process";
import * as path from "path";

describe("Item 6: Real Entrypoint Server Boot Validation", () => {
  const serverPath = path.resolve(__dirname, "../../../dist/app/server.js");

  it("fails to boot real server entrypoint (exit code 1) when NODE_ENV=production and MASTER_DEV_PASSWORD is set", () => {
    const result = spawnSync(process.execPath, [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: "production",
        MASTER_DEV_PASSWORD: "secretdevpassword",
        DATABASE_URL: "postgresql://postgres:123456@127.0.0.1:5432/avarta_db?schema=test_suite&pgbouncer=true",
        DIRECT_URL: "postgresql://postgres:123456@127.0.0.1:5432/avarta_db?schema=test_suite",
        JWT_SECRET: "a-secure-production-secret-at-least-32chars!!",
        APP_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    const combinedOutput = (result.stdout || "") + (result.stderr || "");
    expect(combinedOutput).toMatch(/FATAL SECURITY VIOLATION/);
    expect(combinedOutput).toMatch(/MASTER_DEV_PASSWORD/);
  }, 15000);

  it("fails to boot real server entrypoint (exit code 1) when NODE_ENV=production and MASTER_DEV_EMAIL is set", () => {
    const result = spawnSync(process.execPath, [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: "production",
        MASTER_DEV_EMAIL: "dev@avarta.local",
        DATABASE_URL: "postgresql://postgres:123456@127.0.0.1:5432/avarta_db?schema=test_suite&pgbouncer=true",
        DIRECT_URL: "postgresql://postgres:123456@127.0.0.1:5432/avarta_db?schema=test_suite",
        JWT_SECRET: "a-secure-production-secret-at-least-32chars!!",
        APP_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    const combinedOutput = (result.stdout || "") + (result.stderr || "");
    expect(combinedOutput).toMatch(/FATAL SECURITY VIOLATION/);
    expect(combinedOutput).toMatch(/MASTER_DEV_EMAIL/);
  }, 15000);
});
