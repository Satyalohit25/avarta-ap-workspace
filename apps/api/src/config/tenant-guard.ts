import { Prisma } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * AGENTS.md Rule 7: Tenant isolation — every business table carries organization_id.
 * AGENTS.md Rule 4: invoices.status is a read-only projection maintained by the engine.
 *
 * This Prisma middleware enforces both rules at the query level across all environments:
 *
 * 1. TENANT GUARD: Enforces that queries on org-scoped models strictly include
 *    organizationId in their where/selector clauses across all query actions.
 *
 * 2. FSM WRITE GUARD: Rejects direct writes to `invoices.status` or
 *    `invoices.workflowState` unless the engine bypass flag is set.
 */

// Models that carry organizationId and must be tenant-scoped
export const ORG_SCOPED_MODELS = new Set([
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

// Actions guarded by tenant isolation
export const GUARDED_ACTIONS = [
  "findMany",
  "findFirst",
  "findUnique",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
];

// Symbol used by the workflow engine to bypass the FSM write guard
export const ENGINE_BYPASS = Symbol.for("clearops.engine.bypass");

const engineStorage = new AsyncLocalStorage<{ isEngine: boolean }>();
export function runWithEngineBypass<T>(fn: () => Promise<T>): Promise<T> {
  return engineStorage.run({ isEngine: true }, fn);
}
export function isEngineContext(): boolean {
  return engineStorage.getStore()?.isEngine === true;
}

const trackingStorage = new AsyncLocalStorage<{ isTrackingLookup: boolean }>();
export function runWithTrackingLookupBypass<T>(fn: () => Promise<T>): Promise<T> {
  return trackingStorage.run({ isTrackingLookup: true }, fn);
}
export function isTrackingLookupContext(): boolean {
  return trackingStorage.getStore()?.isTrackingLookup === true;
}

const systemJobStorage = new AsyncLocalStorage<{ jobName: string }>();
export function runWithSystemJobBypass<T>(jobName: string, fn: () => Promise<T>): Promise<T> {
  return systemJobStorage.run({ jobName }, fn);
}
export function isSystemJobContext(): boolean {
  return systemJobStorage.getStore() !== undefined;
}
export function getSystemJobName(): string | undefined {
  return systemJobStorage.getStore()?.jobName;
}

const backfillStorage = new AsyncLocalStorage<{ jobName: string; operator: string }>();
export function runWithAdminBackfillBypass<T>(
  jobName: string,
  operator: string,
  fn: () => Promise<T>
): Promise<T> {
  if (process.env.NODE_ENV === "production") {
    const hasCliFlag = process.argv.includes("--confirm-production-backfill");
    const hasEnvVar = process.env.ALLOW_PROD_BACKFILL === "true";
    if (!hasCliFlag || !hasEnvVar) {
      throw new Error(
        `AGENTS.md Production Gate: ${jobName} refused in production without explicit confirmation flag ` +
        `(--confirm-production-backfill) and environment variable ALLOW_PROD_BACKFILL=true.`
      );
    }
  }
  console.log(`[BACKFILL AUDIT] Starting backfill job "${jobName}" triggered by "${operator}" at ${new Date().toISOString()}`);
  return backfillStorage.run({ jobName, operator }, fn);
}
export function isBackfillContext(): boolean {
  return backfillStorage.getStore() !== undefined;
}

const seederStorage = new AsyncLocalStorage<{ isSeeder: boolean }>();
export function runWithSeederBypass<T>(fn: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AGENTS.md Rule 7: Seeder bypass is permanently forbidden in production environments."
    );
  }
  return seederStorage.run({ isSeeder: true }, fn);
}
export function isSeederContext(): boolean {
  return seederStorage.getStore()?.isSeeder === true;
}

/**
 * Recursively verifies that a Prisma where clause contains valid tenant scoping.
 *
 * Rules for logical operators:
 * - AND: organizationId must be present in at least ONE branch.
 * - OR: organizationId must be present in EVERY branch (to prevent tenant hopping).
 * - NOT: Does NOT satisfy tenant scoping.
 */
export function checkWhereHasTenantFilter(where: any): boolean {
  if (!where || typeof where !== "object") {
    return false;
  }

  // 1. Direct organizationId filter
  if ("organizationId" in where && where.organizationId !== undefined) {
    return true;
  }

  // 2. Nested parent relation scoping (e.g., { invoice: { organizationId } })
  if (where.invoice && typeof where.invoice === "object" && checkWhereHasTenantFilter(where.invoice)) {
    return true;
  }

  // 3. Compound unique selector objects
  if (where.id_organizationId && typeof where.id_organizationId === "object" && "organizationId" in where.id_organizationId) {
    return true;
  }
  if (where.key_organizationId && typeof where.key_organizationId === "object" && "organizationId" in where.key_organizationId) {
    return true;
  }
  if (where.organizationId_invoiceNumber && typeof where.organizationId_invoiceNumber === "object" && "organizationId" in where.organizationId_invoiceNumber) {
    return true;
  }
  if (where.organizationId_supplierCode && typeof where.organizationId_supplierCode === "object" && "organizationId" in where.organizationId_supplierCode) {
    return true;
  }
  if (where.organizationId_poNumber && typeof where.organizationId_poNumber === "object" && "organizationId" in where.organizationId_poNumber) {
    return true;
  }
  if (where.organizationId_email && typeof where.organizationId_email === "object" && "organizationId" in where.organizationId_email) {
    return true;
  }
  if (where.organizationId_grnNumber && typeof where.organizationId_grnNumber === "object" && "organizationId" in where.organizationId_grnNumber) {
    return true;
  }

  // 4. AND logical operator: organizationId in at least one branch
  if (where.AND) {
    if (Array.isArray(where.AND) && where.AND.length > 0) {
      if (where.AND.some((branch: any) => checkWhereHasTenantFilter(branch))) {
        return true;
      }
    } else if (typeof where.AND === "object") {
      if (checkWhereHasTenantFilter(where.AND)) {
        return true;
      }
    }
  }

  // 5. OR logical operator: organizationId must be present in EVERY branch
  if (where.OR) {
    if (Array.isArray(where.OR) && where.OR.length > 0) {
      if (where.OR.every((branch: any) => checkWhereHasTenantFilter(branch))) {
        return true;
      }
    }
  }

  // NOT is strictly rejected as a tenant scoping mechanism
  return false;
}

/**
 * Registers Prisma middleware for tenant isolation and FSM write protection.
 */
export function registerGuardMiddleware(prisma: {
  $use: (middleware: Prisma.Middleware) => void;
}) {
  prisma.$use(async (params, next) => {
    // ── 1. FSM Write Guard ────────────────────────────────────────────
    // Block direct writes to invoices.status or workflowState unless
    // the call originates from the workflow engine (bypass flag set).
    if (
      params.model === "Invoice" &&
      (params.action === "update" || params.action === "updateMany")
    ) {
      const data = params.args?.data;
      if (data && (data.status !== undefined || data.workflowState !== undefined)) {
        const bypassed =
          isEngineContext() ||
          (params as unknown as Record<symbol, boolean>)[ENGINE_BYPASS] ||
          (params.args as unknown as Record<symbol, boolean>)?.[ENGINE_BYPASS];

        if (!bypassed) {
          throw new Error(
            "AGENTS.md Rule 4: invoices.status and workflowState may only be written by the workflow engine. " +
            "Use applyTransition() from workflow/engine.ts instead."
          );
        }
      }
    }

    // ── 2. Tenant Guard ───────────────────────────────────────────────
    // Enforce organizationId on all org-scoped models across all query actions
    if (params.model && ORG_SCOPED_MODELS.has(params.model)) {
      // Named Bypass Exemption: Seeder context
      if (isSeederContext()) {
        return next(params);
      }

      // Named Bypass Exemption: Backfill context
      if (isBackfillContext()) {
        return next(params);
      }

      // Named Bypass Exemption: System job context (e.g. IdempotencyKey expired cleanup)
      if (isSystemJobContext()) {
        if (params.model === "IdempotencyKey" && (params.action === "deleteMany" || params.action === "delete")) {
          return next(params);
        }
      }

      // Named Bypass Exemption: Public tracking token hash lookup
      if (
        params.model === "Invoice" &&
        (params.action === "findFirst" || params.action === "findUnique") &&
        params.args?.where &&
        isTrackingLookupContext() &&
        Object.keys(params.args.where).length === 1 &&
        "trackingTokenHash" in params.args.where
      ) {
        return next(params);
      }

      // Creation Guard: Direct row creation must carry organizationId
      if (params.action === "create") {
        const data = params.args?.data;
        if (!data || typeof data !== "object" || !("organizationId" in data) || !data.organizationId) {
          console.error(
            `[TENANT GUARD VIOLATION] Create on ${params.model} missing organizationId. Args: ${JSON.stringify(data || {})}`
          );
          const err = new Error(
            `AGENTS.md Rule 7: Row creation on ${params.model} must include organizationId.`
          );
          (err as any).isTenantGuardViolation = true;
          (err as any).targetModel = params.model;
          (err as any).targetAction = params.action;
          throw err;
        }
        return next(params);
      }

      if (params.action === "createMany") {
        const dataArr = params.args?.data;
        const valid =
          Array.isArray(dataArr) &&
          dataArr.length > 0 &&
          dataArr.every((row: any) => row && typeof row === "object" && "organizationId" in row && row.organizationId);
        if (!valid) {
          console.error(
            `[TENANT GUARD VIOLATION] createMany on ${params.model} missing organizationId in rows.`
          );
          const err = new Error(
            `AGENTS.md Rule 7: Row creation on ${params.model} must include organizationId.`
          );
          (err as any).isTenantGuardViolation = true;
          (err as any).targetModel = params.model;
          (err as any).targetAction = params.action;
          throw err;
        }
        return next(params);
      }

      // Guarded Query & Mutation Actions
      if (GUARDED_ACTIONS.includes(params.action)) {
        const where = params.args?.where;
        const hasOrgId = checkWhereHasTenantFilter(where);

        if (!hasOrgId) {
          console.error(
            `[TENANT GUARD VIOLATION] Query on ${params.model}.${params.action} missing organizationId filter. Args: ${JSON.stringify(where || {})}`
          );
          const err = new Error(
            `AGENTS.md Rule 7: All queries on ${params.model} must include organizationId. ` +
            `Never trust organizationId from a request body — derive it from the authenticated session.`
          );
          (err as any).isTenantGuardViolation = true;
          (err as any).targetModel = params.model;
          (err as any).targetAction = params.action;
          throw err;
        }

        // For upsert, additionally verify create data carries organizationId
        if (params.action === "upsert") {
          const createData = params.args?.create;
          if (!createData || !("organizationId" in createData)) {
            console.error(
              `[TENANT GUARD VIOLATION] Upsert create block on ${params.model} missing organizationId.`
            );
            const err = new Error(
              `AGENTS.md Rule 7: All queries on ${params.model} must include organizationId.`
            );
            (err as any).isTenantGuardViolation = true;
            (err as any).targetModel = params.model;
            (err as any).targetAction = params.action;
            throw err;
          }
        }
      }
    }

    return next(params);
  });
}
