import http from "http";
import { createApp } from "../src/app/app";
import { signAccessToken } from "../src/lib/jwt";
import { prisma } from "../src/config/database";
import { Role, Prisma } from "@prisma/client";
import { runWithSeederBypass } from "../src/config/tenant-guard";

interface SweepResult {
  role: string;
  method: string;
  path: string;
  status: number;
  tenantGuardViolation: boolean;
  errorLine?: string;
  stackSnippet?: string;
  bodySnippet?: string;
}

function doRequest(
  port: number,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: unknown
): Promise<{ status: number; text: string; json?: unknown }> {
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
          let json: unknown = undefined;
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

export async function runRouteSweep() {
  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  const { orgId, supplier, po } = await runWithSeederBypass(async () => {
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: { name: "Route Sweep Org", defaultCurrency: "INR", country: "IN" },
      });
    }
    const orgId = org.id;

    const supplier = await prisma.supplier.upsert({
      where: { organizationId_supplierCode: { organizationId: orgId, supplierCode: "SWEEP-SUP-01" } },
      update: {},
      create: {
        organizationId: orgId,
        supplierCode: "SWEEP-SUP-01",
        displayName: "Sweep Test Supplier",
        legalName: "Sweep Test Supplier Ltd",
        currency: "INR",
        paymentTermsDays: 30,
        status: "ACTIVE",
      },
    });

    const po = await prisma.purchaseOrder.upsert({
      where: { organizationId_poNumber: { organizationId: orgId, poNumber: "PO-SWEEP-001" } },
      update: {},
      create: {
        organizationId: orgId,
        supplierId: supplier.id,
        poNumber: "PO-SWEEP-001",
        currency: "INR",
        totalAmount: new Prisma.Decimal("50000.00"),
        utilizedAmount: new Prisma.Decimal("0.00"),
        remainingAmount: new Prisma.Decimal("50000.00"),
        status: "OPEN",
      },
    });

    return { orgId, supplier, po };
  });

  const roles = [
    "ADMINISTRATOR",
    "FINANCE_MANAGER",
    "FINANCE_EXECUTIVE",
    "APPROVER",
    "READ_ONLY",
  ] as const;

  const userMap: Record<string, { id: string; email: string }> = {
    ADMINISTRATOR: { id: "user_demo_admin", email: "admin@avarta.dev" },
    FINANCE_MANAGER: { id: "user_demo_manager", email: "manager@avarta.dev" },
    FINANCE_EXECUTIVE: { id: "user_demo_executive", email: "executive@avarta.dev" },
    APPROVER: { id: "user_demo_approver", email: "approver@avarta.dev" },
    READ_ONLY: { id: "user_demo_readonly", email: "readonly@avarta.dev" },
  };

  // Intercept console.error to capture exact stack traces during request execution
  const originalError = console.error;
  let currentLogBuffer: string[] = [];
  console.error = (...args: unknown[]) => {
    const text = args
      .map((a) => (a instanceof Error ? `${a.message}\n${a.stack}` : typeof a === "object" ? JSON.stringify(a) : String(a)))
      .join(" ");
    currentLogBuffer.push(text);
    originalError(...args);
  };

  const results: SweepResult[] = [];

  try {
    for (const role of roles) {
      const activeUser = userMap[role];
      const token = signAccessToken({
        userId: activeUser.id,
        organizationId: orgId,
        role: role as Role,
        tokenVersion: 0,
      });

      // Seed dedicated fresh entities per role so state transitions in one role don't conflict with another
      const {
        invReceived,
        approval,
        exception,
        paymentScheduled,
        invPaid,
      } = await runWithSeederBypass(async () => {
        const invReceived = await prisma.invoice.upsert({
          where: { organizationId_invoiceNumber: { organizationId: orgId, invoiceNumber: `INV-SWEEP-REC-${role}` } },
          update: { workflowState: "RECEIVED", status: "RECEIVED" },
          create: {
            organizationId: orgId,
            supplierId: supplier.id,
            invoiceNumber: `INV-SWEEP-REC-${role}`,
            totalAmount: new Prisma.Decimal("12000.00"),
            currency: "INR",
            workflowState: "RECEIVED",
            status: "RECEIVED",
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 86400000),
          },
        });

        const invWaitingApproval = await prisma.invoice.upsert({
          where: { organizationId_invoiceNumber: { organizationId: orgId, invoiceNumber: `INV-SWEEP-APP-${role}` } },
          update: { workflowState: "WAITING_APPROVAL", status: "PENDING_APPROVAL" },
          create: {
            organizationId: orgId,
            supplierId: supplier.id,
            invoiceNumber: `INV-SWEEP-APP-${role}`,
            totalAmount: new Prisma.Decimal("25000.00"),
            currency: "INR",
            workflowState: "WAITING_APPROVAL",
            status: "PENDING_APPROVAL",
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 86400000),
          },
        });

        const approval = await prisma.approval.upsert({
          where: { id: `appr-sweep-${invWaitingApproval.id}` },
          update: { status: "PENDING" },
          create: {
            id: `appr-sweep-${invWaitingApproval.id}`,
            invoiceId: invWaitingApproval.id,
            approverId: activeUser.id,
            sequenceNumber: 1,
            status: "PENDING",
          },
        });

        const invException = await prisma.invoice.upsert({
          where: { organizationId_invoiceNumber: { organizationId: orgId, invoiceNumber: `INV-SWEEP-EXC-${role}` } },
          update: { workflowState: "VALIDATION_FAILED", status: "EXCEPTION" },
          create: {
            organizationId: orgId,
            supplierId: supplier.id,
            invoiceNumber: `INV-SWEEP-EXC-${role}`,
            totalAmount: new Prisma.Decimal("18000.00"),
            currency: "INR",
            workflowState: "VALIDATION_FAILED",
            status: "EXCEPTION",
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 86400000),
          },
        });

        const exception = await prisma.exception.upsert({
          where: { id: `exc-sweep-${invException.id}` },
          update: { status: "OPEN" },
          create: {
            id: `exc-sweep-${invException.id}`,
            organizationId: orgId,
            invoiceId: invException.id,
            type: "PRICE_DIFFERENCE",
            severity: "HIGH",
            status: "OPEN",
            title: "Price Difference Detected",
            description: "Line item price differs from PO unit price",
          },
        });

        const invScheduled = await prisma.invoice.upsert({
          where: { organizationId_invoiceNumber: { organizationId: orgId, invoiceNumber: `INV-SWEEP-SCH-${role}` } },
          update: { workflowState: "SCHEDULED", status: "SCHEDULED" },
          create: {
            organizationId: orgId,
            supplierId: supplier.id,
            invoiceNumber: `INV-SWEEP-SCH-${role}`,
            totalAmount: new Prisma.Decimal("30000.00"),
            currency: "INR",
            workflowState: "SCHEDULED",
            status: "SCHEDULED",
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 86400000),
          },
        });

        const paymentScheduled = await prisma.payment.upsert({
          where: { id: `pay-sweep-${invScheduled.id}` },
          update: { status: "SCHEDULED" },
          create: {
            id: `pay-sweep-${invScheduled.id}`,
            organizationId: orgId,
            invoiceId: invScheduled.id,
            amount: new Prisma.Decimal("30000.00"),
            currency: "INR",
            status: "SCHEDULED",
            scheduledDate: new Date(),
          },
        });

        const invPaid = await prisma.invoice.upsert({
          where: { organizationId_invoiceNumber: { organizationId: orgId, invoiceNumber: `INV-SWEEP-PAID-${role}` } },
          update: { workflowState: "PAID", status: "PAID" },
          create: {
            organizationId: orgId,
            supplierId: supplier.id,
            invoiceNumber: `INV-SWEEP-PAID-${role}`,
            totalAmount: new Prisma.Decimal("45000.00"),
            currency: "INR",
            workflowState: "PAID",
            status: "PAID",
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() - 5 * 86400000),
          },
        });

        // Ensure WorkflowInstance records exist for all seeded invoices so transitions execute fully
        await prisma.workflowInstance.upsert({
          where: { invoiceId: invReceived.id },
          update: { currentState: "RECEIVED" },
          create: { invoiceId: invReceived.id, currentState: "RECEIVED" },
        });
        await prisma.workflowInstance.upsert({
          where: { invoiceId: invWaitingApproval.id },
          update: { currentState: "WAITING_APPROVAL" },
          create: { invoiceId: invWaitingApproval.id, currentState: "WAITING_APPROVAL" },
        });
        await prisma.workflowInstance.upsert({
          where: { invoiceId: invException.id },
          update: { currentState: "VALIDATION_FAILED" },
          create: { invoiceId: invException.id, currentState: "VALIDATION_FAILED" },
        });
        await prisma.workflowInstance.upsert({
          where: { invoiceId: invScheduled.id },
          update: { currentState: "SCHEDULED" },
          create: { invoiceId: invScheduled.id, currentState: "SCHEDULED" },
        });
        await prisma.workflowInstance.upsert({
          where: { invoiceId: invPaid.id },
          update: { currentState: "PAID" },
          create: { invoiceId: invPaid.id, currentState: "PAID" },
        });

        return {
          invReceived,
          invWaitingApproval,
          approval,
          invException,
          exception,
          invScheduled,
          paymentScheduled,
          invPaid,
        };
      });

      const routes: Array<{ method: "GET" | "POST" | "PUT"; path: string; body?: unknown; desc: string }> = [
        // Auth
        { method: "GET", path: "/api/v1/auth/me", desc: "Auth Me" },
        { method: "GET", path: "/api/v1/auth/team", desc: "Auth Team" },
        { method: "POST", path: "/api/v1/auth/team/invite", body: { email: `test-${role.toLowerCase()}-${Date.now()}@test.com`, fullName: "Test Team", role: "READ_ONLY" }, desc: "Invite Team Member" },

        // Dashboard
        { method: "GET", path: "/api/v1/dashboard", desc: "Dashboard Overview" },

        // Invoices Read & Mutations
        { method: "GET", path: "/api/v1/invoices", desc: "List Invoices" },
        { method: "GET", path: "/api/v1/invoices/needs-attention", desc: "Needs Attention Invoices" },
        { method: "GET", path: `/api/v1/invoices/${invReceived.id}`, desc: "Get Single Invoice" },
        { method: "PUT", path: `/api/v1/invoices/${invReceived.id}`, body: { invoiceNumber: invReceived.invoiceNumber }, desc: "Update Invoice" },
        { method: "GET", path: `/api/v1/invoices/${invReceived.id}/tracking`, desc: "Get Invoice Tracking" },
        { method: "POST", path: `/api/v1/invoices/${invReceived.id}/tracking/regenerate`, body: {}, desc: "Regenerate Tracking Token" },
        { method: "POST", path: `/api/v1/invoices/${invReceived.id}/process`, body: {}, desc: "Process Received Invoice" },
        { method: "POST", path: `/api/v1/invoices/${invPaid.id}/erp-sync`, body: { targetErp: "quickbooks" }, desc: "Sync Paid Invoice to ERP" },
        { method: "GET", path: `/api/v1/invoices/${invReceived.id}/audit`, desc: "Invoice Audit History" },

        // Suppliers
        { method: "GET", path: "/api/v1/suppliers", desc: "List Suppliers" },
        { method: "GET", path: `/api/v1/suppliers/${supplier.id}`, desc: "Get Single Supplier" },
        { method: "POST", path: "/api/v1/suppliers", body: { supplierCode: `SUP-${Date.now().toString(36).toUpperCase()}`, displayName: "New Supplier", legalName: "New Supplier Legal" }, desc: "Create Supplier" },

        // Exceptions
        { method: "GET", path: "/api/v1/exceptions", desc: "List Exceptions" },
        { method: "POST", path: `/api/v1/exceptions/${exception.id}/assign`, body: { assignedToId: activeUser.id }, desc: "Assign Exception" },
        { method: "POST", path: `/api/v1/exceptions/${exception.id}/resolve`, body: { resolution: "Authorized discrepancy after supplier review" }, desc: "Resolve Open Exception" },

        // Approvals
        { method: "GET", path: "/api/v1/approvals", desc: "List Approvals" },
        { method: "POST", path: `/api/v1/approvals/${approval.id}/approve`, body: { notes: "Approved via sweep test" }, desc: "Approve Invoice" },

        // Payments
        { method: "GET", path: "/api/v1/payments", desc: "List Payments" },
        { method: "GET", path: "/api/v1/payments/export-file?format=csv", desc: "Export Bank File CSV" },
        { method: "POST", path: `/api/v1/payments/${paymentScheduled.id}/execute`, body: {}, desc: "Execute Scheduled Payment" },
        { method: "POST", path: "/api/v1/payments/batch/run", body: { paymentIds: [paymentScheduled.id] }, desc: "Run Payments Batch" },

        // Purchase Orders
        { method: "GET", path: "/api/v1/purchase-orders", desc: "List Purchase Orders" },
        { method: "GET", path: `/api/v1/purchase-orders/${po.id}`, desc: "Get Single Purchase Order" },

        // Audit & Reports
        { method: "GET", path: "/api/v1/audit", desc: "Audit Log" },
        { method: "GET", path: "/api/v1/reports/operational?timeRange=30d", desc: "Operational Reports" },
        { method: "GET", path: "/api/v1/reports/aging", desc: "Aging Reports" },
        { method: "GET", path: "/api/v1/reports/cash-forecast", desc: "Cash Forecast Reports" },

        // Integrations & Billing
        { method: "GET", path: "/api/v1/integrations/status", desc: "Integrations Status" },
        { method: "GET", path: "/api/v1/billing/plans", desc: "Billing Plans" },
        { method: "GET", path: "/api/v1/billing/usage", desc: "Billing Usage" },
        { method: "GET", path: "/api/v1/billing/receipts", desc: "Billing Receipts" },
      ];

      for (const r of routes) {
        currentLogBuffer = [];
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": `sweep-${role}-${r.method}-${Math.random().toString(36).substring(2, 8)}`,
          "Content-Type": "application/json",
        };

        const res = await doRequest(port, r.method, r.path, headers, r.body);
        const loggedText = currentLogBuffer.join("\n");
        const isViolation =
          loggedText.includes("AGENTS.md Rule 7") ||
          (res.status === 500 && (res.json?.error?.message?.includes("AGENTS.md Rule 7") || res.text?.includes("AGENTS.md Rule 7")));

        let errorLine = "";
        let stackSnippet = "";
        if (loggedText.includes("AGENTS.md Rule 7") || res.status === 500) {
          const matchLine = loggedText.match(/at (.*(?:apps[\\\/]api[\\\/]src|workflow|modules|config)[^)\n]+)/);
          if (matchLine) {
            errorLine = matchLine[1].trim();
          }
          const violationMatch = loggedText.match(/\[TENANT GUARD VIOLATION\][^\n]+/);
          if (violationMatch) {
            stackSnippet = violationMatch[0];
          }
        }

        results.push({
          role,
          method: r.method,
          path: r.path,
          status: res.status,
          tenantGuardViolation: isViolation,
          errorLine,
          stackSnippet,
          bodySnippet: res.status !== 200 ? JSON.stringify(res.json || res.text) : undefined,
        });
      }
    }
  } finally {
    server.close();
    console.error = originalError;
  }

  return results;
}

runRouteSweep()
  .then((results) => {
    console.log("\n==================== ROLE-ISOLATED ROUTE SWEEP REPORT ====================");
    console.log(`Total route-role combinations tested: ${results.length}`);

    const statusCounts: Record<number, number> = {};
    for (const r of results) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    }
    console.log("Status distribution:", statusCounts);

    const violations = results.filter((r) => r.status === 500 || r.tenantGuardViolation);
    console.log(`\nTotal 500 / Guard Violations: ${violations.length}`);
    console.log("\n--- COMPLETE 500 ROWS WITH STACK TRACE & CALL SITES ---");
    violations.forEach((v, idx) => {
      console.log(
        `Row #${idx + 1} | [${v.role}] ${v.method} ${v.path}\n` +
        `  Status: ${v.status} | Guard Violation: ${v.tenantGuardViolation}\n` +
        `  Violation: ${v.stackSnippet || "N/A"}\n` +
        `  Stack Call Site: ${v.errorLine || "Captured in server error log"}\n`
      );
    });

    console.log("\n--- COMPLETE NON-200 RESPONSES (403, 404, 409, 500) ---");
    for (const r of results) {
      if (r.status !== 200) {
        console.log(`[${r.status}] [${r.role}] ${r.method} ${r.path} -> ${r.bodySnippet || ""}`);
      }
    }

    process.exit(0);
  })
  .catch((err) => {
    console.error("Sweep crashed:", err);
    process.exit(1);
  });
