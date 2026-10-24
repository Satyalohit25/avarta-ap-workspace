import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { errorHandler } from "./error-handler";
import { Request, Response } from "express";

describe("Error Handler Middleware (Doc 14 §14.7 Envelope & SIEM Logging)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    req = {
      method: "PUT",
      url: "/invoices/inv-123",
      originalUrl: "/api/v1/invoices/inv-123",
      requestId: "req-test-uuid-456",
      auth: {
        userId: "user-operator-001",
        organizationId: "org-tenant-999",
        role: "FINANCE_MANAGER",
      },
    };
    res = {
      status: statusMock,
      json: jsonMock,
    };
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("maps Prisma P2025 error to HTTP 404 with standard error envelope and anti-enumeration message", () => {
    const p2025Error = new Error("An operation failed because it depends on one or more records that were required but not found.");
    (p2025Error as any).code = "P2025";

    errorHandler(p2025Error, req as Request, res as Response, vi.fn());

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      error: {
        code: "NOT_FOUND",
        message: "Entity not found",
        requestId: "req-test-uuid-456",
      },
    });
  });

  it("logs tenant guard violations with operator user ID and organization ID from req.auth", () => {
    const guardError = new Error("AGENTS.md Rule 7: All queries on Invoice must include organizationId.");
    (guardError as any).isTenantGuardViolation = true;
    (guardError as any).targetModel = "Invoice";
    (guardError as any).targetAction = "update";

    errorHandler(guardError, req as Request, res as Response, vi.fn());

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
        requestId: "req-test-uuid-456",
      },
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[SECURITY AUDIT] [TENANT GUARD VIOLATION] PUT /api/v1/invoices/inv-123 attempted unguarded update on Invoice. Operator: user-operator-001 Org: org-tenant-999 RequestId: req-test-uuid-456")
    );
  });

  it("handles unauthenticated tenant guard violations gracefully", () => {
    req.auth = undefined;
    const guardError = new Error("AGENTS.md Rule 7: All queries on Supplier must include organizationId.");
    (guardError as any).isTenantGuardViolation = true;
    (guardError as any).targetModel = "Supplier";
    (guardError as any).targetAction = "findFirst";

    errorHandler(guardError, req as Request, res as Response, vi.fn());

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Operator: unknown Org: none RequestId: req-test-uuid-456")
    );
  });
});
