import http from "http";
import jwt from "jsonwebtoken";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createApp } from "../../app/app";
import { router } from "../../app/routes";
import { signAccessToken } from "../../lib/jwt";
import * as jwtLib from "../../lib/jwt";
import { env } from "../../config/env";
import {
  CANONICAL_ROLES,
  Role,
  ROUTE_PERMISSION_POLICY,
  findRoutePolicy,
  isMutatingMethod,
  isRouteAllowed,
  canApprove,
  isAdmin,
  canExecutePayments,
  canManageBilling,
  canViewAudit,
  normalizePath,
} from "./permission-policy";
import {
  canApprove as webCanApprove,
  isAdmin as webIsAdmin,
  canExecutePayments as webCanExecutePayments,
  canManageBilling as webCanManageBilling,
  canViewAudit as webCanViewAudit,
} from "../../../../web/src/lib/permissions";

interface RegisteredRoute {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
}

function extractAllRegisteredRoutes(): RegisteredRoute[] {
  const routes: RegisteredRoute[] = [];

  function walk(stack: any[], currentPrefix: string) {
    for (const layer of stack) {
      if (layer.route) {
        const subPath = layer.route.path === "/" ? "" : layer.route.path;
        const fullPath = normalizePath(currentPrefix + subPath);
        for (const [method, isEnabled] of Object.entries(layer.route.methods)) {
          if (isEnabled) {
            routes.push({
              method: method.toUpperCase() as RegisteredRoute["method"],
              path: fullPath,
            });
          }
        }
      } else if (layer.name === "router" && layer.handle?.stack) {
        let mountPath = "";
        if (layer.regexp) {
          mountPath = layer.regexp.source
            .replace("^\\", "")
            .replace("\\/?(?=\\/|$)", "")
            .replace(/\\\//g, "/");
          if (!mountPath.startsWith("/")) {
            mountPath = "/" + mountPath;
          }
        }
        walk(layer.handle.stack, currentPrefix + mountPath);
      }
    }
  }

  walk(router.stack, "/api/v1");
  return routes;
}

function doRequest(
  port: number,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: unknown
): Promise<{ status: number; text: string; json?: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path,
        headers,
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          let json: any = undefined;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode || 0, text, json });
        });
      }
    );
    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

describe("T-403: Role-by-Route Permission Matrix Test Suite", () => {
  const registeredRoutes = extractAllRegisteredRoutes();
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    vi.spyOn(jwtLib, "verifyAccessTokenAsync").mockImplementation(async (token: string) => {
      return jwt.verify(token, env.jwtSecret) as jwtLib.AuthTokenPayload;
    });
    const app = createApp();
    server = app.listen(0);
    const addr = server.address();
    port = typeof addr === "object" && addr ? addr.port : 0;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  function getAuthToken(role: Role): string {
    return signAccessToken({
      userId: `user_test_${role.toLowerCase()}`,
      organizationId: "org_test_perm_matrix",
      role,
      tokenVersion: 0,
    });
  }

  it("extracts all registered Express routes from the main API router", () => {
    expect(registeredRoutes.length).toBeGreaterThan(30);
    expect(registeredRoutes).toContainEqual({ method: "GET", path: "/api/v1/invoices" });
    expect(registeredRoutes).toContainEqual({ method: "POST", path: "/api/v1/invoices" });
    expect(registeredRoutes).toContainEqual({ method: "POST", path: "/api/v1/payments/:paymentId/execute" });
  });

  it("fails if any registered Express route lacks an entry in ROUTE_PERMISSION_POLICY", () => {
    const unmappedRoutes: RegisteredRoute[] = [];

    for (const route of registeredRoutes) {
      const policy = findRoutePolicy(route.method, route.path);
      if (!policy) {
        unmappedRoutes.push(route);
      }
    }

    expect(
      unmappedRoutes,
      `Every registered route MUST have a policy entry in ROUTE_PERMISSION_POLICY. Found ${unmappedRoutes.length} unmapped route(s): ${JSON.stringify(
        unmappedRoutes,
        null,
        2
      )}`
    ).toEqual([]);
  });

  it("verifies READ_ONLY can NEVER call a mutating endpoint (Policy Invariant)", () => {
    for (const policy of ROUTE_PERMISSION_POLICY) {
      if (isMutatingMethod(policy.method)) {
        if (!policy.isPublic && policy.path !== "/api/v1/auth/logout") {
          expect(
            policy.allowedRoles,
            `Mutating route [${policy.method}] ${policy.path} must NEVER allow READ_ONLY`
          ).not.toContain("READ_ONLY");

          const allowed = isRouteAllowed("READ_ONLY", policy.method, policy.path);
          expect(
            allowed,
            `isRouteAllowed('READ_ONLY', '${policy.method}', '${policy.path}') must evaluate to false`
          ).toBe(false);
        }
      }
    }
  });

  it("verifies expected allow and deny for all 5 roles across all registered routes", () => {
    const roles: Role[] = [
      "ADMINISTRATOR",
      "FINANCE_MANAGER",
      "FINANCE_EXECUTIVE",
      "APPROVER",
      "READ_ONLY",
    ];

    for (const route of registeredRoutes) {
      const policy = findRoutePolicy(route.method, route.path);
      expect(policy, `Route [${route.method}] ${route.path} must exist in policy`).toBeDefined();
      if (!policy) continue;

      for (const role of roles) {
        const allowed = isRouteAllowed(role, route.method, route.path);
        const shouldBeAllowed = policy.isPublic || policy.allowedRoles.includes(role);

        // Strict invariant override for READ_ONLY on mutations
        const finalExpected =
          role === "READ_ONLY" && isMutatingMethod(route.method) && !policy.isPublic && route.path !== "/api/v1/auth/logout"
            ? false
            : shouldBeAllowed;

        expect(
          allowed,
          `Role ${role} on [${route.method}] ${route.path} expected ${finalExpected} but got ${allowed}`
        ).toBe(finalExpected);
      }
    }
  });

  it("verifies admin-only routes reject all non-ADMINISTRATOR roles", () => {
    const adminOnlyRoutes = ROUTE_PERMISSION_POLICY.filter(
      (p) => !p.isPublic && p.allowedRoles.length === 1 && p.allowedRoles[0] === "ADMINISTRATOR"
    );

    expect(adminOnlyRoutes.length).toBeGreaterThan(0);

    const nonAdminRoles: Role[] = ["FINANCE_MANAGER", "FINANCE_EXECUTIVE", "APPROVER", "READ_ONLY"];

    for (const policy of adminOnlyRoutes) {
      for (const role of nonAdminRoles) {
        const allowed = isRouteAllowed(role, policy.method, policy.path);
        expect(
          allowed,
          `Admin-only route [${policy.method}] ${policy.path} must reject ${role}`
        ).toBe(false);
      }
    }
  });

  it("verifies payment creation & execution routes strictly reject FINANCE_EXECUTIVE, APPROVER, and READ_ONLY", () => {
    const paymentMutations = ROUTE_PERMISSION_POLICY.filter(
      (p) => p.path.startsWith("/api/v1/payments") && isMutatingMethod(p.method)
    );

    expect(paymentMutations.length).toBeGreaterThan(0);

    const prohibitedRoles: Role[] = ["FINANCE_EXECUTIVE", "APPROVER", "READ_ONLY"];

    for (const policy of paymentMutations) {
      for (const role of prohibitedRoles) {
        const allowed = isRouteAllowed(role, policy.method, policy.path);
        expect(
          allowed,
          `Payment mutation [${policy.method}] ${policy.path} must forbid ${role}`
        ).toBe(false);
      }
    }
  });

  it("verifies frontend role checks align exactly with backend policy authority", () => {
    for (const role of CANONICAL_ROLES) {
      // canApprove
      expect(webCanApprove(role)).toBe(canApprove(role));
      if (role === "ADMINISTRATOR" || role === "FINANCE_MANAGER" || role === "APPROVER") {
        expect(canApprove(role)).toBe(true);
      } else {
        expect(canApprove(role)).toBe(false);
      }

      // isAdmin
      expect(webIsAdmin(role)).toBe(isAdmin(role));
      if (role === "ADMINISTRATOR") {
        expect(isAdmin(role)).toBe(true);
      } else {
        expect(isAdmin(role)).toBe(false);
      }

      // canExecutePayments
      expect(webCanExecutePayments(role)).toBe(canExecutePayments(role));
      if (role === "ADMINISTRATOR" || role === "FINANCE_MANAGER") {
        expect(canExecutePayments(role)).toBe(true);
      } else {
        expect(canExecutePayments(role)).toBe(false);
      }

      // canManageBilling
      expect(webCanManageBilling(role)).toBe(canManageBilling(role));
      if (role === "ADMINISTRATOR" || role === "FINANCE_MANAGER") {
        expect(canManageBilling(role)).toBe(true);
      } else {
        expect(canManageBilling(role)).toBe(false);
      }

      // canViewAudit
      expect(webCanViewAudit(role)).toBe(canViewAudit(role));
      if (role === "ADMINISTRATOR" || role === "FINANCE_MANAGER") {
        expect(canViewAudit(role)).toBe(true);
      } else {
        expect(canViewAudit(role)).toBe(false);
      }
    }
  });

  // =========================================================================
  // HTTP Execution Verification (Live Express App)
  // =========================================================================

  it("HTTP: verifies READ_ONLY is rejected with 403 Forbidden on all mutating endpoints", async () => {
    const readOnlyToken = getAuthToken("READ_ONLY");
    const testMutations: Array<{ method: string; path: string; body?: any }> = [
      { method: "POST", path: "/api/v1/invoices", body: { invoiceNumber: "INV-RO-TEST" } },
      { method: "PUT", path: "/api/v1/invoices/inv-test-id", body: { invoiceNumber: "INV-RO-TEST" } },
      { method: "POST", path: "/api/v1/invoices/inv-test-id/process", body: {} },
      { method: "POST", path: "/api/v1/invoices/inv-test-id/transitions", body: { event: "APPROVED" } },
      { method: "POST", path: "/api/v1/invoices/inv-test-id/erp-sync", body: {} },
      { method: "PATCH", path: "/api/v1/invoices/inv-test-id/lines/line-1/override", body: {} },
      { method: "PATCH", path: "/api/v1/invoices/inv-test-id/decision-hub", body: {} },
      { method: "POST", path: "/api/v1/payments", body: { invoiceId: "inv-test-id" } },
      { method: "POST", path: "/api/v1/payments/pay-test-id/execute", body: {} },
      { method: "POST", path: "/api/v1/payments/batch/run", body: { paymentIds: ["pay-1"] } },
      { method: "POST", path: "/api/v1/approvals/appr-test-id/approve", body: {} },
      { method: "POST", path: "/api/v1/approvals/appr-test-id/reject", body: { reason: "Rejected" } },
      { method: "POST", path: "/api/v1/suppliers", body: { displayName: "RO Supplier" } },
      { method: "POST", path: "/api/v1/purchase-orders", body: { poNumber: "PO-RO-TEST" } },
      { method: "POST", path: "/api/v1/purchase-orders/po-test-id/receiving", body: { closed: true } },
      { method: "POST", path: "/api/v1/exceptions/exc-test-id/assign", body: { assignedToId: "user-1" } },
      { method: "POST", path: "/api/v1/exceptions/exc-test-id/resolve", body: { resolution: "Resolved" } },
      { method: "PATCH", path: "/api/v1/organization/settings", body: { companyName: "RO Edit" } },
      { method: "POST", path: "/api/v1/notifications/read-all", body: {} },
      { method: "POST", path: "/api/v1/notifications/notif-1/read", body: {} },
      { method: "PATCH", path: "/api/v1/auth/me", body: { fullName: "New Name" } },
      { method: "POST", path: "/api/v1/auth/mfa/enroll", body: {} },
      { method: "POST", path: "/api/v1/items", body: { itemCode: "ITEM-RO" } },
      { method: "POST", path: "/api/v1/bank-accounts", body: { accountNumber: "123456" } },
    ];

    for (const test of testMutations) {
      const res = await doRequest(
        port,
        test.method,
        test.path,
        {
          Authorization: `Bearer ${readOnlyToken}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `ro-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        },
        test.body
      );

      expect(
        res.status,
        `HTTP [${test.method}] ${test.path} for READ_ONLY must respond with 403 Forbidden`
      ).toBe(403);
    }
  });

  it("HTTP: verifies admin-only routes reject non-admin roles with 403 Forbidden", async () => {
    const managerToken = getAuthToken("FINANCE_MANAGER");
    const executiveToken = getAuthToken("FINANCE_EXECUTIVE");
    const approverToken = getAuthToken("APPROVER");

    // Organization settings PATCH
    const resOrg = await doRequest(
      port,
      "PATCH",
      "/api/v1/organization/settings",
      {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      { companyName: "Unauthorized" }
    );
    expect(resOrg.status).toBe(403);

    // Integrations status GET
    const resIntegrations = await doRequest(
      port,
      "GET",
      "/api/v1/integrations/status",
      {
        Authorization: `Bearer ${managerToken}`,
      }
    );
    expect(resIntegrations.status).toBe(403);

    // Team deactivate POST
    const resDeact = await doRequest(
      port,
      "POST",
      "/api/v1/auth/team/user-target-id/deactivate",
      {
        Authorization: `Bearer ${executiveToken}`,
      }
    );
    expect(resDeact.status).toBe(403);

    // API Keys list GET
    const resApiKeys = await doRequest(
      port,
      "GET",
      "/api/v1/api-keys",
      {
        Authorization: `Bearer ${approverToken}`,
      }
    );
    expect(resApiKeys.status).toBe(403);
  });

  it("HTTP: verifies payment execution strictly rejects FINANCE_EXECUTIVE and APPROVER with 403 Forbidden", async () => {
    const executiveToken = getAuthToken("FINANCE_EXECUTIVE");
    const approverToken = getAuthToken("APPROVER");

    const resExec = await doRequest(
      port,
      "POST",
      "/api/v1/payments/pay-123/execute",
      {
        Authorization: `Bearer ${executiveToken}`,
        "Idempotency-Key": "idemp-exec-1",
      }
    );
    expect(resExec.status).toBe(403);

    const resAppr = await doRequest(
      port,
      "POST",
      "/api/v1/payments/pay-123/execute",
      {
        Authorization: `Bearer ${approverToken}`,
        "Idempotency-Key": "idemp-appr-1",
      }
    );
    expect(resAppr.status).toBe(403);
  });

  it("HTTP: verifies approval endpoints strictly reject FINANCE_EXECUTIVE with 403 Forbidden", async () => {
    const executiveToken = getAuthToken("FINANCE_EXECUTIVE");

    const resApprove = await doRequest(
      port,
      "POST",
      "/api/v1/approvals/appr-123/approve",
      {
        Authorization: `Bearer ${executiveToken}`,
      }
    );
    expect(resApprove.status).toBe(403);

    const resReject = await doRequest(
      port,
      "POST",
      "/api/v1/approvals/appr-123/reject",
      {
        Authorization: `Bearer ${executiveToken}`,
      },
      { reason: "Invalid" }
    );
    expect(resReject.status).toBe(403);
  });

  it("HTTP: verifies unauthenticated requests to protected endpoints return 401 Unauthorized", async () => {
    const resInv = await doRequest(port, "GET", "/api/v1/invoices", {});
    expect(resInv.status).toBe(401);

    const resPay = await doRequest(port, "GET", "/api/v1/payments", {});
    expect(resPay.status).toBe(401);

    const resAudit = await doRequest(port, "GET", "/api/v1/audit", {});
    expect(resAudit.status).toBe(401);
  });
});
