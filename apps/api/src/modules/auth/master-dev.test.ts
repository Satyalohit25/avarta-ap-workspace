import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { validateEnvironment } from "../../config/env";
import { login } from "./service";

describe("Master Dev Login Security & Startup Check (ACT-P0-D)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fails startup in validateEnvironment when NODE_ENV is production and MASTER_DEV_PASSWORD is set", () => {
    process.env.NODE_ENV = "production";
    process.env.MASTER_DEV_PASSWORD = "secretdevpassword";
    delete process.env.MASTER_DEV_EMAIL;

    expect(() => validateEnvironment()).toThrow(/FATAL SECURITY VIOLATION/);
  });

  it("fails startup in validateEnvironment when NODE_ENV is production and MASTER_DEV_EMAIL is set", () => {
    process.env.NODE_ENV = "production";
    process.env.MASTER_DEV_EMAIL = "dev@avarta.local";
    delete process.env.MASTER_DEV_PASSWORD;

    expect(() => validateEnvironment()).toThrow(/FATAL SECURITY VIOLATION/);
  });

  it("does not permit master dev login when NODE_ENV is production", async () => {
    process.env.NODE_ENV = "production";
    process.env.MASTER_DEV_EMAIL = "dev@avarta.local";
    process.env.MASTER_DEV_PASSWORD = "devpassword123";

    await expect(
      login("dev@avarta.local", "devpassword123")
    ).rejects.toThrow(/Invalid email or password/);
  });

  it("does not permit master dev login when NODE_ENV is unset (behaves as non-development)", async () => {
    delete process.env.NODE_ENV;
    process.env.MASTER_DEV_EMAIL = "dev@avarta.local";
    process.env.MASTER_DEV_PASSWORD = "devpassword123";

    await expect(
      login("dev@avarta.local", "devpassword123")
    ).rejects.toThrow(/Invalid email or password/);
  });

  it("rejects hardcoded admin@avarta.dev if MASTER_DEV_EMAIL is different", async () => {
    process.env.NODE_ENV = "development";
    process.env.MASTER_DEV_EMAIL = "custom-admin@avarta.local";
    process.env.MASTER_DEV_PASSWORD = "devpassword123";

    await expect(
      login("admin@avarta.dev", "devpassword123")
    ).rejects.toThrow(/Invalid email or password/);
  });
});
