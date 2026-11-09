import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "../../config/database";
import {
  confirmDatabaseTarget,
  getDatabaseDetails,
  getDatabaseHost,
  validateDatabaseHost,
  verifyDatabaseConnection,
  assertNoCliPasswordArg,
  provisionInitialAdmin,
  promptHidden,
} from "../../../scripts/create-initial-admin";

describe("Admin CLI: Remote Database Support & Target Confirmation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("Database Details Extraction", () => {
    it("extracts host and database name accurately from standard connection URLs", () => {
      const remoteUrl = "postgresql://user:pass@ep-cool-dawn-123456.us-east-2.aws.neon.tech/neondb";
      const details = getDatabaseDetails(remoteUrl);
      expect(details.host).toBe("ep-cool-dawn-123456.us-east-2.aws.neon.tech");
      expect(details.databaseName).toBe("neondb");
    });

    it("extracts host and database name from loopback connection URLs", () => {
      const localUrl = "postgresql://postgres:secret@127.0.0.1:5432/scratch_db";
      const details = getDatabaseDetails(localUrl);
      expect(details.host).toBe("127.0.0.1");
      expect(details.databaseName).toBe("scratch_db");
    });

    it("extracts host and database name from IPv6 loopback connection URLs", () => {
      const ipv6Url = "postgresql://postgres:secret@[::1]:5432/avarta_local";
      const details = getDatabaseDetails(ipv6Url);
      expect(details.host).toBe("::1");
      expect(details.databaseName).toBe("avarta_local");
    });

    it("extracts host and database name when query parameters are present", () => {
      const urlWithQuery = "postgresql://user:pass@db.cloud-provider.internal:5432/production_app?sslmode=require&channel_binding=prefer";
      const details = getDatabaseDetails(urlWithQuery);
      expect(details.host).toBe("db.cloud-provider.internal");
      expect(details.databaseName).toBe("production_app");
    });

    it("reads from DATABASE_URL environment variable if no connection string is provided", () => {
      process.env.DATABASE_URL = "postgresql://envuser:envpass@remote-host.cloud.io:5432/env_tenant_db";
      const details = getDatabaseDetails();
      expect(details.host).toBe("remote-host.cloud.io");
      expect(details.databaseName).toBe("env_tenant_db");
    });

    it("throws an error when DATABASE_URL is missing or empty", () => {
      delete process.env.DATABASE_URL;
      expect(() => getDatabaseDetails("")).toThrow("DATABASE_URL environment variable is not defined");
    });

    it("throws an error when DATABASE_URL is malformed", () => {
      expect(() => getDatabaseDetails("not-a-valid-url")).toThrow("Unable to parse database details from DATABASE_URL");
    });

    it("maintains backward-compatible getDatabaseHost and validateDatabaseHost", () => {
      expect(getDatabaseHost("postgresql://u:p@db.example.org:5432/mydb")).toBe("db.example.org");
      expect(validateDatabaseHost("postgresql://u:p@db.example.org:5432/mydb")).toBe("db.example.org");
      expect(validateDatabaseHost("postgresql://postgres:pass@127.0.0.1:5432/mydb")).toBe("127.0.0.1");
      expect(validateDatabaseHost("postgresql://postgres:pass@[::1]:5432/mydb")).toBe("::1");
    });
  });

  describe("Host & Database Name Printing", () => {
    it("prints Target Database Host and Target Database Name clearly to console", async () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const testUrl = "postgresql://user:pass@ep-cool-dawn-123456.us-east-2.aws.neon.tech/neondb";

      await confirmDatabaseTarget({
        connectionString: testUrl,
        args: ["--yes"],
        isTTY: false,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith("Target Database Host: ep-cool-dawn-123456.us-east-2.aws.neon.tech");
      expect(consoleLogSpy).toHaveBeenCalledWith("Target Database Name: neondb");
    });
  });

  describe("Remote Database Execution & --yes Flag", () => {
    it("proceeds immediately when --yes is present against a loopback database", async () => {
      const loopbackUrl = "postgresql://postgres:pass@127.0.0.1:5432/scratch_db";
      const details = await confirmDatabaseTarget({
        connectionString: loopbackUrl,
        args: ["--yes"],
        isTTY: false,
      });

      expect(details.host).toBe("127.0.0.1");
      expect(details.databaseName).toBe("scratch_db");
    });

    it("proceeds past the host check when running with a simulated remote host and --yes", async () => {
      const remoteUrl = "postgresql://remote_admin:secret@ep-cool-dawn.us-east-2.aws.neon.tech/neondb";
      const details = await confirmDatabaseTarget({
        connectionString: remoteUrl,
        args: ["--yes"],
        isTTY: false,
      });

      expect(details.host).toBe("ep-cool-dawn.us-east-2.aws.neon.tech");
      expect(details.databaseName).toBe("neondb");
    });

    it("proceeds past the host check when running with a simulated remote host and -y short flag", async () => {
      const remoteUrl = "postgresql://remote_admin:secret@ep-cool-dawn.us-east-2.aws.neon.tech/neondb";
      const details = await confirmDatabaseTarget({
        connectionString: remoteUrl,
        args: ["-y"],
        isTTY: false,
      });

      expect(details.host).toBe("ep-cool-dawn.us-east-2.aws.neon.tech");
      expect(details.databaseName).toBe("neondb");
    });
  });

  describe("Non-Interactive Safety Guard", () => {
    it("aborts non-interactive execution without --yes with safety message and exit code 1", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      let exitCode: number | null = null;

      const exitFn = vi.fn((code: number) => {
        exitCode = code;
        throw new Error(`CLI_EXIT_${code}`);
      });

      await expect(
        confirmDatabaseTarget({
          connectionString: "postgresql://remote_user:pass@cloud-db.internal/app_db",
          args: [],
          isTTY: false,
          exitFn,
        })
      ).rejects.toThrow("CLI_EXIT_1");

      expect(exitFn).toHaveBeenCalledWith(1);
      expect(exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[SAFETY ABORT] Non-interactive execution against database requires the --yes flag."
      );
    });

    it("aborts non-interactive execution when other arguments are passed without --yes", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      let exitCode: number | null = null;

      const exitFn = vi.fn((code: number) => {
        exitCode = code;
        throw new Error(`CLI_EXIT_${code}`);
      });

      await expect(
        confirmDatabaseTarget({
          connectionString: "postgresql://user:pass@prod.database.net/core",
          args: ["--company=Acme", "--name=Admin", "--email=admin@acme.dev"],
          isTTY: false,
          exitFn,
        })
      ).rejects.toThrow("CLI_EXIT_1");

      expect(exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[SAFETY ABORT] Non-interactive execution against database requires the --yes flag.")
      );
    });
  });

  describe("Interactive Confirmation Prompt (TTY Mode)", () => {
    it("prompts user and proceeds when user confirms with 'y'", async () => {
      const promptFn = vi.fn(async () => "y");
      const details = await confirmDatabaseTarget({
        connectionString: "postgresql://user:pass@ep-cool-dawn.us-east-2.aws.neon.tech/neondb",
        args: [],
        isTTY: true,
        promptFn,
      });

      expect(promptFn).toHaveBeenCalledWith(
        "Are you sure you want to create an initial admin on this database? (y/N): "
      );
      expect(details.host).toBe("ep-cool-dawn.us-east-2.aws.neon.tech");
      expect(details.databaseName).toBe("neondb");
    });

    it("prompts user and proceeds when user confirms with 'yes' (case-insensitive)", async () => {
      const promptFn = vi.fn(async () => "  YES  ");
      const details = await confirmDatabaseTarget({
        connectionString: "postgresql://user:pass@remote.internal/prod_db",
        args: [],
        isTTY: true,
        promptFn,
      });

      expect(promptFn).toHaveBeenCalled();
      expect(details.host).toBe("remote.internal");
      expect(details.databaseName).toBe("prod_db");
    });

    it("aborts cleanly with exit code 0 when user declines prompt with 'n'", async () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      let exitCode: number | null = null;
      const exitFn = vi.fn((code: number) => {
        exitCode = code;
        throw new Error(`CLI_EXIT_${code}`);
      });
      const promptFn = vi.fn(async () => "n");

      await expect(
        confirmDatabaseTarget({
          connectionString: "postgresql://user:pass@remote.internal/prod_db",
          args: [],
          isTTY: true,
          promptFn,
          exitFn,
        })
      ).rejects.toThrow("CLI_EXIT_0");

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith("Operation cancelled by user.");
    });

    it("aborts cleanly with exit code 0 when user enters empty input (default No)", async () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      let exitCode: number | null = null;
      const exitFn = vi.fn((code: number) => {
        exitCode = code;
        throw new Error(`CLI_EXIT_${code}`);
      });
      const promptFn = vi.fn(async () => "");

      await expect(
        confirmDatabaseTarget({
          connectionString: "postgresql://user:pass@remote.internal/prod_db",
          args: [],
          isTTY: true,
          promptFn,
          exitFn,
        })
      ).rejects.toThrow("CLI_EXIT_0");

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith("Operation cancelled by user.");
    });
  });

  describe("Database Connectivity Verification", () => {
    it("resolves when prisma connectivity check succeeds", async () => {
      const connectSpy = vi.spyOn(prisma, "$connect").mockResolvedValueOnce(undefined);
      await expect(verifyDatabaseConnection()).resolves.toBeUndefined();
      expect(connectSpy).toHaveBeenCalled();
    });

    it("throws descriptive error when prisma connectivity check fails", async () => {
      vi.spyOn(prisma, "$connect").mockRejectedValueOnce(new Error("Connection refused at port 5432"));
      await expect(verifyDatabaseConnection()).rejects.toThrow(
        "Database connectivity check failed: Connection refused at port 5432"
      );
    });
  });

  describe("CLI Security Invariants & Provisioning Logic", () => {
    it("rejects --password CLI argument to prevent shell history and ps leaks", () => {
      expect(() => {
        assertNoCliPasswordArg(["--company=Acme", "--password=SuperSecret123"]);
      }).toThrow(/FATAL SECURITY VIOLATION/);

      expect(() => {
        assertNoCliPasswordArg(["-p=SuperSecret123"]);
      }).toThrow(/FATAL SECURITY VIOLATION/);

      expect(() => {
        assertNoCliPasswordArg(["-p"]);
      }).toThrow(/FATAL SECURITY VIOLATION/);

      expect(() => {
        assertNoCliPasswordArg(["--pass=Secret123"]);
      }).toThrow(/FATAL SECURITY VIOLATION/);

      expect(() => {
        assertNoCliPasswordArg(["--PASSWORD=Secret123"]);
      }).toThrow(/FATAL SECURITY VIOLATION/);
    });

    it("exports promptHidden for hidden interactive password entry", () => {
      expect(typeof promptHidden).toBe("function");
    });

    it("allows non-sensitive CLI arguments", () => {
      expect(() => {
        assertNoCliPasswordArg(["--company=Acme", "--name=Admin", "--email=admin@acme.dev", "--yes"]);
      }).not.toThrow();
    });

    it("provisions initial admin idempotently", async () => {
      const testEmail = `admin-cli-verify-${Date.now()}@test-gate.dev`;
      const companyName = `Gate Test Company ${Date.now()}`;

      const res = await provisionInitialAdmin(
        {
          companyName,
          fullName: "Remote DB Admin",
          email: testEmail,
          password: "SecurePass123!@#",
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

      // Subsequent call is idempotent no-op
      const secondRes = await provisionInitialAdmin(
        {
          companyName,
          fullName: "Remote DB Admin",
          email: testEmail,
          password: "SecurePass123!@#",
          country: "IN",
        },
        {
          expectedHost: "127.0.0.1",
          confirmedHost: "127.0.0.1",
        }
      );

      expect(secondRes.status).toBe("ALREADY_EXISTS");
      expect(secondRes.message).toContain("idempotent no-op");
    });
  });
});
