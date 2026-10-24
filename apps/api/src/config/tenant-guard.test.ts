import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  registerGuardMiddleware,
  runWithEngineBypass,
  runWithSystemJobBypass,
  runWithSeederBypass,
  runWithAdminBackfillBypass,
  GUARDED_ACTIONS,
} from "./tenant-guard";
import { Prisma } from "@prisma/client";

describe("Tenant Guard and FSM Write Guard Middleware", () => {
  let middleware: Prisma.Middleware;
  const mockPrisma = {
    $use: (fn: Prisma.Middleware) => {
      middleware = fn;
    },
  };

  beforeEach(() => {
    registerGuardMiddleware(mockPrisma);
  });

  describe("FSM Write Guard (AGENTS.md Rule 4)", () => {
    it("throws when application updates invoice status directly without engine bypass", async () => {
      const next = vi.fn();
      const params: Prisma.MiddlewareParams = {
        model: "Invoice",
        action: "update",
        args: {
          where: { id: "inv-1", organizationId: "org-1" },
          data: { status: "APPROVED" as any },
        },
        dataPath: [],
        runInTransaction: false,
      };

      await expect(middleware(params, next)).rejects.toThrow(
        /AGENTS.md Rule 4: invoices.status and workflowState may only be written by the workflow engine/
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("allows invoice status update when executed within runWithEngineBypass", async () => {
      const next = vi.fn().mockResolvedValue({ id: "inv-1", status: "APPROVED" });
      const params: Prisma.MiddlewareParams = {
        model: "Invoice",
        action: "update",
        args: {
          where: { id: "inv-1", organizationId: "org-1" },
          data: { status: "APPROVED" as any },
        },
        dataPath: [],
        runInTransaction: false,
      };

      const result = await runWithEngineBypass(async () => {
        return middleware(params, next);
      });

      expect(next).toHaveBeenCalledWith(params);
      expect(result).toEqual({ id: "inv-1", status: "APPROVED" });
    });

    it("allows non-status invoice updates without engine bypass", async () => {
      const next = vi.fn().mockResolvedValue({ id: "inv-1", invoiceNumber: "INV-999" });
      const params: Prisma.MiddlewareParams = {
        model: "Invoice",
        action: "update",
        args: {
          where: { id: "inv-1", organizationId: "org-1" },
          data: { invoiceNumber: "INV-999" },
        },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, next);
      expect(next).toHaveBeenCalledWith(params);
    });
  });

  describe("Tenant Isolation Guard - All Actions (AGENTS.md Rule 7)", () => {
    // Test every single guarded action rejects missing organizationId
    for (const action of GUARDED_ACTIONS) {
      it(`blocks ${action} on org-scoped model when where clause lacks organizationId`, async () => {
        const next = vi.fn();
        const params: Prisma.MiddlewareParams = {
          model: "Invoice",
          action: action as any,
          args: {
            where: { id: "inv-1" },
            create: { invoiceNumber: "INV-1" },
            update: { invoiceNumber: "INV-1-MOD" },
            data: { invoiceNumber: "INV-1-MOD" },
          },
          dataPath: [],
          runInTransaction: false,
        };

        await expect(middleware(params, next)).rejects.toThrow(
          /AGENTS.md Rule 7: All queries on Invoice must include organizationId/
        );
        expect(next).not.toHaveBeenCalled();
      });

      it(`permits ${action} on org-scoped model when where clause includes organizationId`, async () => {
        const next = vi.fn().mockResolvedValue({ success: true });
        const params: Prisma.MiddlewareParams = {
          model: "Invoice",
          action: action as any,
          args: {
            where: { id: "inv-1", organizationId: "org-1" },
            create: { invoiceNumber: "INV-1", organizationId: "org-1" },
            update: { invoiceNumber: "INV-1-MOD" },
            data: { invoiceNumber: "INV-1-MOD" },
          },
          dataPath: [],
          runInTransaction: false,
        };

        const result = await middleware(params, next);
        expect(next).toHaveBeenCalledWith(params);
        expect(result).toEqual({ success: true });
      });
    }

    it("permits compound unique selector id_organizationId on update", async () => {
      const next = vi.fn().mockResolvedValue({ id: "inv-1" });
      const params: Prisma.MiddlewareParams = {
        model: "Invoice",
        action: "update",
        args: {
          where: { id_organizationId: { id: "inv-1", organizationId: "org-1" } },
          data: { invoiceNumber: "INV-123" },
        },
        dataPath: [],
        runInTransaction: false,
      };

      const result = await middleware(params, next);
      expect(next).toHaveBeenCalledWith(params);
      expect(result).toEqual({ id: "inv-1" });
    });
  });

  describe("Tenant Isolation Guard - Logical Operators (AND, OR, NOT)", () => {
    it("permits AND when at least one branch contains organizationId", async () => {
      const next = vi.fn().mockResolvedValue([{ id: "inv-1" }]);
      const params: Prisma.MiddlewareParams = {
        model: "Invoice",
        action: "findMany",
        args: {
          where: {
            AND: [
              { status: "RECEIVED" as any },
              { organizationId: "org-1" },
            ],
          },
        },
        dataPath: [],
        runInTransaction: false,
      };

      const result = await middleware(params, next);
      expect(next).toHaveBeenCalledWith(params);
      expect(result).toEqual([{ id: "inv-1" }]);
    });

    it("rejects AND when none of the branches contain organizationId", async () => {
      const next = vi.fn();
      const params: Prisma.MiddlewareParams = {
        model: "Invoice",
        action: "findMany",
        args: {
          where: {
            AND: [
              { status: "RECEIVED" as any },
              { totalAmount: 1000 },
            ],
          },
        },
        dataPath: [],
        runInTransaction: false,
      };

      await expect(middleware(params, next)).rejects.toThrow(
        /AGENTS.md Rule 7: All queries on Invoice must include organizationId/
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("permits OR when EVERY branch contains organizationId", async () => {
      const next = vi.fn().mockResolvedValue([{ id: "inv-1" }]);
      const params: Prisma.MiddlewareParams = {
        model: "Invoice",
        action: "findMany",
        args: {
          where: {
            OR: [
              { status: "RECEIVED" as any, organizationId: "org-1" },
              { status: "CAPTURED" as any, organizationId: "org-1" },
            ],
          },
        },
        dataPath: [],
        runInTransaction: false,
      };

      const result = await middleware(params, next);
      expect(next).toHaveBeenCalledWith(params);
      expect(result).toEqual([{ id: "inv-1" }]);
    });

    it("strictly rejects OR if ANY branch lacks organizationId (anti-tenant hopping)", async () => {
      const next = vi.fn();
      const params: Prisma.MiddlewareParams = {
        model: "Invoice",
        action: "findMany",
        args: {
          where: {
            OR: [
              { status: "RECEIVED" as any, organizationId: "org-1" },
              { id: "victim-invoice-id" }, // Missing organizationId!
            ],
          },
        },
        dataPath: [],
        runInTransaction: false,
      };

      await expect(middleware(params, next)).rejects.toThrow(
        /AGENTS.md Rule 7: All queries on Invoice must include organizationId/
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("strictly rejects NOT even if organizationId is nested inside NOT (negation does not scope)", async () => {
      const next = vi.fn();
      const params: Prisma.MiddlewareParams = {
        model: "Invoice",
        action: "findMany",
        args: {
          where: {
            NOT: { organizationId: "other-org" },
          },
        },
        dataPath: [],
        runInTransaction: false,
      };

      await expect(middleware(params, next)).rejects.toThrow(
        /AGENTS.md Rule 7: All queries on Invoice must include organizationId/
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("Named Bypass Wrappers Security Constraints", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("runWithSystemJobBypass allows IdempotencyKey cleanup without organizationId", async () => {
      const next = vi.fn().mockResolvedValue({ count: 15 });
      const params: Prisma.MiddlewareParams = {
        model: "IdempotencyKey",
        action: "deleteMany",
        args: {
          where: { expiresAt: { lt: new Date() } },
        },
        dataPath: [],
        runInTransaction: false,
      };

      const result = await runWithSystemJobBypass("idempotency-key-cleanup", async () => {
        return middleware(params, next);
      });

      expect(next).toHaveBeenCalledWith(params);
      expect(result).toEqual({ count: 15 });
    });

    it("runWithSeederBypass throws immediately in production", () => {
      process.env.NODE_ENV = "production";

      expect(() =>
        runWithSeederBypass(async () => {
          return Promise.resolve("seeded");
        })
      ).toThrow(/AGENTS.md Rule 7: Seeder bypass is permanently forbidden in production/);
    });

    it("runWithAdminBackfillBypass rejects execution in production without CLI flag and env var", () => {
      process.env.NODE_ENV = "production";
      delete process.env.ALLOW_PROD_BACKFILL;

      expect(() =>
        runWithAdminBackfillBypass("tracking-backfill", "admin@avarta.dev", async () => {
          return Promise.resolve(42);
        })
      ).toThrow(/AGENTS.md Production Gate/);
    });

    it("runWithAdminBackfillBypass permits execution in production when CLI flag and env var are confirmed", async () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOW_PROD_BACKFILL = "true";
      process.argv.push("--confirm-production-backfill");

      const res = await runWithAdminBackfillBypass("tracking-backfill", "admin@avarta.dev", async () => {
        return Promise.resolve(42);
      });

      expect(res).toBe(42);

      // Cleanup
      const idx = process.argv.indexOf("--confirm-production-backfill");
      if (idx !== -1) process.argv.splice(idx, 1);
      delete process.env.ALLOW_PROD_BACKFILL;
    });
  });
});
