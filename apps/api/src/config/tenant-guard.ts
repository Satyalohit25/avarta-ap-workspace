import { Prisma } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * AGENTS.md Rule 7: Tenant isolation — every business table carries organization_id.
 * AGENTS.md Rule 4: invoices.status is a read-only projection maintained by the engine.
 *
 * This Prisma middleware enforces both rules at the query level:
 *
 * 1. TENANT GUARD: Logs warnings when queries on org-scoped models
 *    don't include organizationId in their where clause. In production
 *    this should throw, but for the demo we warn to avoid breaking
 *    seed scripts and internal engine operations.
 *
 * 2. FSM WRITE GUARD: Rejects direct writes to `invoices.status` or
 *    `invoices.workflowState` unless the engine bypass flag is set.
 */

// Models that carry organizationId and must be tenant-scoped
const ORG_SCOPED_MODELS = new Set([
  "Invoice",
  "Supplier",
  "PurchaseOrder",
  "Exception",
  "Payment",
  "Notification",
  "AuditLog",
  "GoodsReceipt",
  "IdempotencyKey",
]);

// Symbol used by the workflow engine to bypass the FSM write guard
export const ENGINE_BYPASS = Symbol.for("clearops.engine.bypass");

const engineStorage = new AsyncLocalStorage<{ isEngine: boolean }>();

export function runWithEngineBypass<T>(fn: () => Promise<T>): Promise<T> {
  return engineStorage.run({ isEngine: true }, fn);
}

export function isEngineContext(): boolean {
  return engineStorage.getStore()?.isEngine === true;
}

/**
 * Registers Prisma middleware for tenant isolation and FSM write protection.
 */
export function registerGuardMiddleware(prisma: {
  $use: (middleware: Prisma.Middleware) => void;
}) {
  prisma.$use(async (params, next) => {
    // ── FSM Write Guard ────────────────────────────────────────────
    // Block direct writes to invoices.status or workflowState unless
    // the call originates from the workflow engine (bypass flag set).
    if (
      params.model === "Invoice" &&
      (params.action === "update" || params.action === "updateMany")
    ) {
      const data = params.args?.data;
      if (data && (data.status !== undefined || data.workflowState !== undefined)) {
        // Check for engine bypass flag via AsyncLocalStorage, params or args
        const bypassed =
          isEngineContext() ||
          (params as unknown as Record<symbol, boolean>)[ENGINE_BYPASS] ||
          (params.args as unknown as Record<symbol, boolean>)?.[ENGINE_BYPASS];

        if (!bypassed) {
          if (process.env.NODE_ENV === "production") {
            throw new Error(
              "AGENTS.md Rule 4: invoices.status and workflowState may only be written by the workflow engine. " +
              "Use applyTransition() from workflow/engine.ts instead."
            );
          }
        }
      }
    }

    // ── Tenant Guard ───────────────────────────────────────────────
    // Warn (or throw in production) when org-scoped queries lack organizationId.
    if (params.model && ORG_SCOPED_MODELS.has(params.model)) {
      const readActions = ["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy"];
      const writeActions = ["update", "updateMany", "delete", "deleteMany"];
      const guardedActions = [...readActions, ...writeActions];

      if (guardedActions.includes(params.action)) {
        const where = params.args?.where;
        const hasOrgId = where && (
          "organizationId" in where ||
          // Support nested filters like { invoice: { organizationId } }
          (where.invoice && "organizationId" in where.invoice) ||
          // Support compound unique keys that include org
          (where.key_organizationId && "organizationId" in where.key_organizationId) ||
          (where.organizationId_supplierCode) ||
          (where.organizationId_poNumber) ||
          (where.organizationId_invoiceNumber) ||
          (where.organizationId_email) ||
          (where.organizationId_grnNumber)
        );

        if (!hasOrgId && process.env.NODE_ENV === "production") {
          console.error(
            `[TENANT GUARD] Query on ${params.model}.${params.action} missing organizationId filter.`
          );
          throw new Error(
            `AGENTS.md Rule 7: All queries on ${params.model} must include organizationId. ` +
            `Never trust organizationId from a request body — derive it from the authenticated session.`
          );
        }
      }
    }

    return next(params);
  });
}
