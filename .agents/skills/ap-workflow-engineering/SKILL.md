---
name: ap-workflow-engineering
description: >-
  Enterprise Accounts Payable workflow engine, Express/TypeScript backend architecture,
  Prisma data layer, multi-tenancy isolation, idempotency, and financial invariants for Avarta AP Workspace.
  Activate when implementing, refactoring, or reviewing backend modules, workflow transitions, database models,
  API endpoints, or financial operations in apps/api.
---

# AP Workflow Engineering & Backend Architecture

High-velocity engineering standard for building robust, secure, multi-tenant financial backend logic in Avarta AP Workspace (`apps/api`).

---

## 1. 6-File Modular Backend Architecture

Every domain module under `apps/api/src/modules/<feature>/` strictly implements the standard 6-file shape:

1. **`controller.ts`**:
   * Parses HTTP request params/body, extracts authenticated session context (`req.user`), delegates to service, and returns standardized JSON responses.
   * **Rule**: Zero business logic, zero database calls, zero direct state mutations.
2. **`service.ts`**:
   * Orchestrates domain workflows, enforces authorization business rules, and invokes the workflow engine for state transitions.
   * **Rule**: Does not access Express `req`/`res`.
3. **`repository.ts`**:
   * Executes Prisma queries and database mutations.
   * **Rule**: Scoped strictly by `organization_id`. Never contains workflow routing or HTTP logic.
4. **`routes.ts`**:
   * Express router declaring endpoints, applying auth middlewares (`authenticate`, `requireRole`), and validating request schemas.
5. **`validation.ts`**:
   * Zod schemas validating request payloads, path parameters, and query strings.
6. **`mapper.ts`**:
   * Transforms Prisma models to client-safe DTOs, stripping internal secrets or tenant-leakable attributes.

---

## 2. Workflow Engine Sanctity (Single Source of Truth)

The Workflow Engine (`apps/api/src/workflow/`) is the **only component authorized to advance invoice workflow states**.

* **Engine States** (`workflow_instances.current_state`):
  `Received` → `Captured` → `Validating` → `Validated` (or `Validation Failed`) → `Matching` → `Matched` (or `Matching Failed`) → `Waiting Approval` → `Scheduled` → `Processing Payment` → `Paid` → `ERP Sync` → `Archived`
  *(Note: `Approved` and `Rejected` are transition events, not resting engine states).*
* **Invoice UI Status Projection** (`invoices.status`):
  `RECEIVED`, `PROCESSING`, `EXCEPTION`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SCHEDULED`, `PAID`, `SYNCED`, `ARCHIVED`.
* **Invariant**: Application controllers and services must never write `invoices.status` or `workflow_instances.current_state` directly. They dispatch events to the Workflow Engine, which transitions the instance and synchronizes the projection.

---

## 3. Non-Negotiable Security & Multi-Tenancy

1. **Strict Tenant Isolation**:
   * Every business query and mutation must filter by `organization_id`.
   * **Never trust `organizationId` from the client request body or query params.** Always derive `organizationId` strictly from the verified authenticated session (`req.user.organizationId`).
2. **Role-Based Access Control (RBAC)**:
   * Only the 5 canonical roles exist: `Administrator`, `Finance Manager`, `Finance Executive`, `Approver`, `Read Only`.
   * Enforce role guards on mutating endpoints (e.g. only `Finance Manager` or `Administrator` can approve high-value invoices or execute batch payment disbursements).

---

## 4. Financial Arithmetic & Idempotency Rules

1. **Idempotency Keys**:
   * Required for payment creation, payment execution, retry actions, batch scheduling, and ERP synchronizations.
   * Idempotency keys must be stable across network retries and generated at the user-action level.
2. **Line-Item 3-Way Matching**:
   * Compare line-level SKU, quantity, unit price, and tax amounts against Purchase Order lines and Goods Received Notes (GRN).
   * Never match based on aggregate invoice scalar totals alone.
3. **Multi-Currency Discipline**:
   * Multi-currency disbursements must be strictly grouped by currency or converted using verified FX rates before computing debit totals.
   * Never aggregate raw currency amounts across different currency codes.
4. **Nothing is Ever Deleted**:
   * Soft-delete, archive, or deactivate only (`is_archived = true`, `status = ARCHIVED`, or `revoked_at = NOW()`).

---

## 5. Architectural Map Discipline (`CODEMAP.md`)

* Read `CODEMAP.md` at the project root before exploring the codebase.
* After adding any new module, route, repository, service, or model, update `CODEMAP.md` in the same task to maintain accurate project indexing.
