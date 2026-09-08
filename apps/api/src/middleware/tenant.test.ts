import { describe, expect, it, vi } from "vitest";
import { requireRole } from "./permissions";
import { Request, Response } from "express";

describe("Tenant Isolation & RBAC Role Enforcement", () => {
  it("denies access to READ_ONLY users attempting financial mutation", () => {
    const req = {
      auth: { userId: "usr-1", role: "READ_ONLY", organizationId: "org-1" },
    } as unknown as Request;
    const next = vi.fn();
    const middleware = requireRole("ADMINISTRATOR", "FINANCE_MANAGER");

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("You do not have permission"),
      })
    );
  });

  it("denies access to FINANCE_EXECUTIVE attempting payment execution", () => {
    const req = {
      auth: { userId: "usr-2", role: "FINANCE_EXECUTIVE", organizationId: "org-1" },
    } as unknown as Request;
    const next = vi.fn();
    const middleware = requireRole("ADMINISTRATOR", "FINANCE_MANAGER");

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("You do not have permission"),
      })
    );
  });

  it("allows ADMINISTRATOR to perform financial operations", () => {
    const req = {
      auth: { userId: "usr-admin", role: "ADMINISTRATOR", organizationId: "org-1" },
    } as unknown as Request;
    const next = vi.fn();
    const middleware = requireRole("ADMINISTRATOR", "FINANCE_MANAGER");

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});
