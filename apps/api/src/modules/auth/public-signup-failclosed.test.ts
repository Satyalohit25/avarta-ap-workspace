import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { isSignupAllowed, signupHandler } from "./controller";
import { isSignupAllowed as serviceIsSignupAllowed } from "./service";
import { validateDatabaseHost } from "../../../scripts/create-initial-admin";
import { createApp } from "../../app/app";
import { ApiError } from "../../lib/errors";

describe("Gate 1: Public Registration Fail-Closed & Admin CLI Host Validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("A. Fail-Closed Public Registration Invariant", () => {
    it("fails closed when ENABLE_PUBLIC_SIGNUP is unset (default)", async () => {
      delete process.env.ENABLE_PUBLIC_SIGNUP;
      delete process.env.ALLOW_PUBLIC_SIGNUP;

      const check = await isSignupAllowed();
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe(
        "Public registration is disabled. Please contact your organization administrator."
      );

      const serviceCheck = await serviceIsSignupAllowed();
      expect(serviceCheck.allowed).toBe(false);
      expect(serviceCheck.reason).toBe(
        "Public registration is disabled. Please contact your organization administrator."
      );
    });

    it("fails closed when ENABLE_PUBLIC_SIGNUP is explicitly 'false'", async () => {
      process.env.ENABLE_PUBLIC_SIGNUP = "false";
      delete process.env.ALLOW_PUBLIC_SIGNUP;

      const check = await isSignupAllowed();
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe(
        "Public registration is disabled. Please contact your organization administrator."
      );
    });

    it("fails closed when ALLOW_PUBLIC_SIGNUP is explicitly 'false' (legacy flag canonicalization)", async () => {
      process.env.ALLOW_PUBLIC_SIGNUP = "false";
      delete process.env.ENABLE_PUBLIC_SIGNUP;

      const check = await isSignupAllowed();
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe(
        "Public registration is disabled. Please contact your organization administrator."
      );

      const serviceCheck = await serviceIsSignupAllowed();
      expect(serviceCheck.allowed).toBe(false);
      expect(serviceCheck.reason).toBe(
        "Public registration is disabled. Please contact your organization administrator."
      );
    });

    it("signupHandler throws ApiError.forbidden with exact message when disabled", async () => {
      delete process.env.ENABLE_PUBLIC_SIGNUP;
      delete process.env.ALLOW_PUBLIC_SIGNUP;

      let caught: any = null;
      const req: any = { body: {} };
      const res: any = {};
      const next = (err: any) => {
        caught = err;
      };

      await signupHandler(req, res, next);
      expect(caught).toBeInstanceOf(ApiError);
      expect(caught.status).toBe(403);
      expect(caught.message).toBe(
        "Public registration is disabled. Please contact your organization administrator."
      );
    });

    it("allows registration when ENABLE_PUBLIC_SIGNUP is explicitly 'true' and under limit", async () => {
      process.env.ENABLE_PUBLIC_SIGNUP = "true";
      process.env.MAX_PUBLIC_SIGNUPS = "999";

      const check = await isSignupAllowed();
      expect(check.allowed).toBe(true);
    });
  });

  describe("B. Live HTTP Rejection for /auth/signup and /auth/register alias", () => {
    let server: http.Server;
    let baseUrl: string;

    beforeAll(async () => {
      // Ensure registration is disabled for live probe
      delete process.env.ENABLE_PUBLIC_SIGNUP;
      delete process.env.ALLOW_PUBLIC_SIGNUP;

      const app = createApp();
      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it("POST /api/v1/auth/signup returns 403 Forbidden with exact message", async () => {
      delete process.env.ENABLE_PUBLIC_SIGNUP;
      delete process.env.ALLOW_PUBLIC_SIGNUP;

      const res = await fetch(`${baseUrl}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Rogue Corp",
          fullName: "Attacker",
          email: "attacker@rogue.dev",
          password: "SuperSecretPassword123!",
        }),
      });

      expect(res.status).toBe(403);
      const data = (await res.json()) as any;
      expect(data.error.message).toBe(
        "Public registration is disabled. Please contact your organization administrator."
      );
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("POST /api/v1/auth/register alias returns 403 Forbidden with exact message", async () => {
      delete process.env.ENABLE_PUBLIC_SIGNUP;
      delete process.env.ALLOW_PUBLIC_SIGNUP;

      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Rogue Corp",
          fullName: "Attacker",
          email: "attacker@rogue.dev",
          password: "SuperSecretPassword123!",
        }),
      });

      expect(res.status).toBe(403);
      const data = (await res.json()) as any;
      expect(data.error.message).toBe(
        "Public registration is disabled. Please contact your organization administrator."
      );
      expect(data.error.code).toBe("FORBIDDEN");
    });
  });

  describe("C. Admin CLI Database Host Resolution", () => {
    it("resolves 127.0.0.1, localhost, and [::1] loopback addresses", () => {
      expect(validateDatabaseHost("postgresql://postgres:pass@127.0.0.1:5432/db")).toBe("127.0.0.1");
      expect(validateDatabaseHost("postgresql://postgres:pass@localhost:5432/db")).toBe("localhost");
      expect(validateDatabaseHost("postgresql://postgres:pass@[::1]:5432/db")).toBe("::1");
    });

    it("resolves remote database hosts without local-only abort", () => {
      expect(
        validateDatabaseHost("postgresql://user:pass@ep-cool-dawn.us-east-2.aws.neon.tech/neondb")
      ).toBe("ep-cool-dawn.us-east-2.aws.neon.tech");

      expect(
        validateDatabaseHost("postgresql://user:pass@db.neon.tech/prod")
      ).toBe("db.neon.tech");
    });
  });
});
