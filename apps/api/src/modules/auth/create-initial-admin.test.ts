import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "../../config/database";
import {
  assertNoCliPasswordArg,
  getDatabaseHost,
  provisionInitialAdmin,
} from "../../../scripts/create-initial-admin";
import { signupHandler } from "./controller";
import { ApiError } from "../../lib/errors";

describe("Production Gate Item C: Initial Admin CLI & Signup Lock", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("CLI Password & Host Confirmation Guards", () => {
    it("rejects --password CLI argument to prevent shell history and ps leaks", () => {
      expect(() => {
        assertNoCliPasswordArg(["--company=Acme", "--password=SuperSecret123"]);
      }).toThrow(/FATAL SECURITY VIOLATION/);

      expect(() => {
        assertNoCliPasswordArg(["-p=SuperSecret123"]);
      }).toThrow(/FATAL SECURITY VIOLATION/);
    });

    it("allows non-sensitive CLI arguments", () => {
      expect(() => {
        assertNoCliPasswordArg(["--company=Acme", "--email=admin@acme.dev", "--confirm-host=127.0.0.1"]);
      }).not.toThrow();
    });

    it("extracts hostname from database connection strings accurately", () => {
      expect(getDatabaseHost("postgresql://user:pass@ep-cool-dawn-123456.us-east-2.aws.neon.tech/neondb")).toBe(
        "ep-cool-dawn-123456.us-east-2.aws.neon.tech"
      );
      expect(getDatabaseHost("postgresql://postgres:123@127.0.0.1:5432/avarta_db")).toBe("127.0.0.1");
    });

    it("aborts execution if database host confirmation does not match target host", async () => {
      await expect(
        provisionInitialAdmin(
          {
            companyName: "Acme Corp",
            fullName: "Acme Admin",
            email: "admin@acme.dev",
            password: "SecurePassword123!",
            country: "IN",
          },
          {
            expectedHost: "prod-db.neon.tech",
            confirmedHost: "wrong-db.neon.tech",
          }
        )
      ).rejects.toThrow(/Database host confirmation mismatch/);
    });

    it("enforces password policy (minimum 12 characters)", async () => {
      await expect(
        provisionInitialAdmin(
          {
            companyName: "Acme Corp",
            fullName: "Acme Admin",
            email: "admin@acme.dev",
            password: "ShortPass1", // 10 characters (strictly < 12)
            country: "IN",
          },
          {
            expectedHost: "127.0.0.1",
            confirmedHost: "127.0.0.1",
          }
        )
      ).rejects.toThrow(/Administrator password must be at least 12 characters long/);
    });

    it("rejects common easily guessable passwords even if 12+ characters", async () => {
      await expect(
        provisionInitialAdmin(
          {
            companyName: "Acme Corp",
            fullName: "Acme Admin",
            email: "admin@acme.dev",
            password: "password123456", // 14 characters but common
            country: "IN",
          },
          {
            expectedHost: "127.0.0.1",
            confirmedHost: "127.0.0.1",
          }
        )
      ).rejects.toThrow(/Password is too common or easily guessable/);
    });
  });

  describe("Idempotent Provisioning & Audit Trail", () => {
    const testEmail = `admin-cli-${Date.now()}@test-gate.dev`;
    const companyName = `Gate Test Company ${Date.now()}`;

    it("creates root organization, administrator user, and audit log entry", async () => {
      const res = await provisionInitialAdmin(
        {
          companyName,
          fullName: "Gate Administrator",
          email: testEmail,
          password: "SecurePassword123!",
          country: "IN",
        },
        {
          expectedHost: "127.0.0.1",
          confirmedHost: "127.0.0.1",
        }
      );

      expect(res.status).toBe("CREATED");
      expect(res.organizationId).toBeDefined();
      expect(res.userId).toBeDefined();

      // Verify DB record
      const dbUser = await prisma.user.findUnique({
        where: { id: res.userId },
        include: { organization: true },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.role).toBe("ADMINISTRATOR");
      expect(dbUser?.status).toBe("ACTIVE");
      expect(dbUser?.organization.name).toBe(companyName);

      // Verify Audit Log entry
      const audit = await prisma.auditLog.findFirst({
        where: {
          organizationId: res.organizationId,
          userId: res.userId,
          action: "INITIAL_ADMIN_PROVISIONED",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.result).toBe("SUCCESS");
    });

    it("is idempotent: subsequent runs do not create duplicate records", async () => {
      const secondRun = await provisionInitialAdmin(
        {
          companyName,
          fullName: "Gate Administrator",
          email: testEmail,
          password: "SecurePassword123!",
          country: "IN",
        },
        {
          expectedHost: "127.0.0.1",
          confirmedHost: "127.0.0.1",
        }
      );

      expect(secondRun.status).toBe("ALREADY_EXISTS");
      expect(secondRun.message).toContain("idempotent no-op");
    });
  });

  describe("Production Signup Lock Guard", () => {
    it("returns 403 Forbidden in production when ALLOW_PUBLIC_SIGNUP is unset or false", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.ALLOW_PUBLIC_SIGNUP;

      let caughtError: any = null;
      const req: any = { body: {} };
      const res: any = {};
      const next = (err: any) => {
        caughtError = err;
      };

      await signupHandler(req, res, next);

      expect(caughtError).toBeInstanceOf(ApiError);
      expect(caughtError.status).toBe(403);
      expect(caughtError.message).toContain("Public signup is disabled in production");
    });

    it("allows signup to proceed in production if ALLOW_PUBLIC_SIGNUP=true", async () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOW_PUBLIC_SIGNUP = "true";

      let caughtError: any = null;
      const req: any = { body: { invalid: true } }; // invalid payload triggers Zod 400, proving it passed the 403 guard
      const res: any = {};
      const next = (err: any) => {
        caughtError = err;
      };

      await signupHandler(req, res, next);

      expect(caughtError).toBeDefined();
      expect(caughtError.status).not.toBe(403); // It passed the guard and failed at validation
    });

    it("allows signup to proceed when NODE_ENV is development or test", async () => {
      process.env.NODE_ENV = "test";
      delete process.env.ALLOW_PUBLIC_SIGNUP;

      let caughtError: any = null;
      const req: any = { body: {} };
      const res: any = {};
      const next = (err: any) => {
        caughtError = err;
      };

      await signupHandler(req, res, next);

      expect(caughtError).toBeDefined();
      expect(caughtError.status).not.toBe(403); // Passed guard
    });
  });
});
