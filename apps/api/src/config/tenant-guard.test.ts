import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { registerGuardMiddleware, runWithEngineBypass } from "./tenant-guard";
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
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

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
      const next = vi.fn().mockResolvedValue({ id: "inv-1", notes: "Updated" });
      const params: Prisma.MiddlewareParams = {
        model: "Invoice",
        action: "update",
        args: {
          where: { id: "inv-1", organizationId: "org-1" },
          data: { notes: "Updated" },
        },
        dataPath: [],
        runInTransaction: false,
      };

      await middleware(params, next);
      expect(next).toHaveBeenCalledWith(params);
    });
  });

  describe("Tenant Isolation Guard (AGENTS.md Rule 7)", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("throws when querying an org-scoped model without organizationId", async () => {
      const next = vi.fn();
      const params: Prisma.MiddlewareParams = {
        model: "Invoice",
        action: "findMany",
        args: {
          where: { status: "RECEIVED" as any },
        },
        dataPath: [],
        runInTransaction: false,
      };

      await expect(middleware(params, next)).rejects.toThrow(
        /AGENTS.md Rule 7: All queries on Invoice must include organizationId/
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("allows querying an org-scoped model when organizationId is present", async () => {
      const next = vi.fn().mockResolvedValue([{ id: "inv-1" }]);
      const params: Prisma.MiddlewareParams = {
        model: "Invoice",
        action: "findMany",
        args: {
          where: { organizationId: "org-123" },
        },
        dataPath: [],
        runInTransaction: false,
      };

      const result = await middleware(params, next);
      expect(next).toHaveBeenCalledWith(params);
      expect(result).toEqual([{ id: "inv-1" }]);
    });
  });
});
