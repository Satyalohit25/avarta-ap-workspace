# CODEMAP.md — Avarta AP Workspace Architecture & System Map
<!-- Auto-maintained structural map & capability catalog for engineering agents & external analysis (Argon).
     Last Updated: 2026-10-24
     Test Verification: 217 passing unit/integration tests across 38 suites | Zero TypeScript errors across apps/api and apps/web. -->

## 1. Workspace Overview

Avarta AP Workspace is an enterprise Accounts Payable orchestration platform for SMEs (10–500 employees). It complements existing ERPs (QuickBooks, Xero, SAP, NetSuite, Tally) rather than replacing them.

```
ap-saas/
├── apps/
│   ├── api/                      # Express + TypeScript + Prisma modular monolith
│   │   ├── prisma/               # schema.prisma, migrations, seeds
│   │   ├── scripts/              # reconcile-tests.ts, route sweeps, backfills
│   │   └── src/
│   │       ├── app/              # Express server setup, route mount, middleware
│   │       ├── config/           # env.ts, tenant-guard.ts, tenant-guard-static.test.ts
│   │       ├── lib/              # crypto.ts (AES-256-GCM), test-db-guard.ts, errors.ts
│   │       ├── middleware/       # auth.ts, permissions.ts, idempotency.ts, error-handler.ts
│   │       ├── modules/          # 18 domain modules
│   │       └── workflow/         # Workflow State Machine (states, transitions, engine)
│   └── web/                      # React 18 + Vite + Tailwind CSS SPA
│       ├── e2e/                  # Playwright end-to-end automation specs
│       └── src/
│           ├── api/              # Strongly typed API clients (client.ts, auth.ts, invoices.ts, items.ts)
│           ├── app/              # App.tsx (React Router v6), AuthContext, ThemeContext
│           ├── components/       # Design system primitives, layout (Sidebar, TopNav), shared widgets
│           ├── design-system/    # tokens.ts (4px grid, Inter typography, HSL semantic palettes)
│           └── pages/            # 17 page directories (protected workspace + public vendor portal)
└── docs/                         # 24 canonical specification docs, runbooks, and audit walkthroughs
```

---

## 2. apps/api — Complete Module & Route Registry

All authenticated API routes are mounted under `/api/v1` in [`apps/api/src/app/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/app/routes.ts). Every business query enforces tenant isolation via `req.auth.organizationId`.

### 2.1 `/auth` — Authentication & Identity Lifecycle
- **Routes:** [`apps/api/src/modules/auth/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/auth/routes.ts)
  - `POST /login`: Email/password authentication, returns signed JWT + user metadata + sets cookie.
  - `GET /me`: Authenticated session introspection (`req.auth`).
  - `POST /refresh`: Refresh token rotation & issuance.
  - `POST /logout`: JWT blacklist revocation (`RevokedToken`) and refresh token invalidation.
  - `POST /password/forgot`: Generates time-limited password reset tokens.
  - `POST /password/reset`: Validates token and updates user password hash.
  - `POST /team/invite`: Invites new organization members (`ADMINISTRATOR`, `FINANCE_MANAGER`).
  - `POST /invite/accept`: Public user onboarding and password setup for invitations.
  - `GET /team/members`: Lists organization users with roles and status.
  - `POST /team/:userId/deactivate`: Deactivates user without deletion (AGENTS.md Rule 3).
- **Core Files:** `controller.ts`, `service.ts`, `validation.ts` (`loginSchema`, `inviteUserSchema`)
- **Prisma Models:** `User`, `Organization`, `RefreshToken`, `RevokedToken`, `LoginLockout`

### 2.2 `/invoices` — Core Invoice Lifecycle & Processing
- **Routes:** [`apps/api/src/modules/invoices/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/invoices/routes.ts)
  - `GET /`: Filtered, paginated invoice list with multi-column sort.
  - `GET /needs-attention`: Triage filter returning invoices requiring manual action.
  - `POST /`: Ingest new invoice (Upload, Email, Portal, Scanner, API).
  - `GET /:invoiceId`: Full invoice detail with lines, documents, validations, exceptions, and audit history.
  - `PUT /:invoiceId`: Update editable fields during intake review (`ADMINISTRATOR`, `FINANCE_MANAGER`, `FINANCE_EXECUTIVE`).
  - `POST /:invoiceId/documents`: Upload and attach source document (PDF, TIFF, PNG).
  - `GET /:invoiceId/documents/:documentId/file`: Secure file stream for document preview pane.
  - `POST /:invoiceId/process`: Trigger OCR parsing, validation rules engine, and 3-way matching.
  - `POST /:invoiceId/transitions`: Advance workflow state via explicit human action (FSM transition).
  - `POST /:invoiceId/erp-sync`: Dispatch invoice journal entry to connected ERP.
  - `GET /:invoiceId/tracking`: **Pure read-only endpoint.** Fetches public tracking URL and expiry (`ADMINISTRATOR`, `FINANCE_MANAGER`, `FINANCE_EXECUTIVE`). Throws `404 Not Found` if token is unminted (safe RFC 9110 read idempotency).
  - `POST /:invoiceId/tracking/regenerate`: **Restricted mutation endpoint.** Generates new 256-bit token, updates `trackingTokenHash`, `trackingTokenEncrypted`, and `trackingTokenExpiresAt`, and creates immutable `AuditLog` entry (`ADMINISTRATOR`, `FINANCE_MANAGER`).
- **Core Files:** `controller.ts`, `service.ts`, `repository.ts`, `validation.ts`, `mapper.ts`, `tax-validator.ts`
- **Prisma Models:** `Invoice`, `InvoiceLine`, `Document`, `Validation`, `Exception`, `Supplier`, `PurchaseOrder`, `WorkflowInstance`, `AuditLog`

### 2.3 `/suppliers` — Vendor Master Directory & Compliance
- **Routes:** [`apps/api/src/modules/suppliers/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/suppliers/routes.ts)
  - `GET /`: List suppliers with payment terms, outstanding balances, and active risk flags.
  - `POST /`: Create supplier record with GSTIN / tax ID validation.
  - `GET /:supplierId`: Fetch supplier detail, linked purchase orders, and historical payment ledger.
  - `PUT /:supplierId`: Update supplier contact, payment terms, or banking coordinates.
- **Core Files:** `controller.ts`, `service.ts`, `repository.ts`, `validation.ts`
- **Prisma Models:** `Supplier`, `PurchaseOrder`, `Invoice`

### 2.4 `/purchase-orders` — PO Management & 3-Way Matching Foundation
- **Routes:** [`apps/api/src/modules/purchase_orders/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/purchase_orders/routes.ts)
  - `GET /`: List purchase orders with line-item totals, utilized amount, and matching status.
  - `GET /:poId`: PO detail including line items, linked invoices, and goods receipts (`GoodsReceipt`).
  - `POST /`: Create purchase order from ERP sync or manual creation.
- **Core Files:** `controller.ts`, `service.ts`, `repository.ts`, `validation.ts`
- **Prisma Models:** `PurchaseOrder`, `Supplier`, `GoodsReceipt`, `GoodsReceiptLine`, `Invoice`

### 2.5 `/exceptions` — Triage Queue & Resolution Engine
- **Routes:** [`apps/api/src/modules/exceptions/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/exceptions/routes.ts)
  - `GET /`: List exceptions filtered by status (`OPEN`, `ASSIGNED`, `UNDER_REVIEW`, `RESOLVED`), severity, and type.
  - `POST /:id/assign`: Assign exception to a specific user (`ExceptionOwner`).
  - `POST /:id/resolve`: Resolve exception with mandatory audit reason; returns invoice to validation/matching pipeline.
- **Core Files:** `controller.ts`, `service.ts`, `repository.ts`
- **Canonical Types (14):** `MISSING_PO`, `UNKNOWN_VENDOR`, `DUPLICATE_INVOICE`, `DUPLICATE_AMOUNT`, `TAX_DIFFERENCE`, `CURRENCY_MISMATCH`, `PRICE_DIFFERENCE`, `QUANTITY_DIFFERENCE`, `MISSING_SIGNATURE`, `INVALID_GST`, `LOW_AI_CONFIDENCE`, `MISSING_REQUIRED_FIELD`, `FRAUD_RISK`, `MANUAL_REVIEW`.
- **Prisma Models:** `Exception`, `Invoice`, `User`, `AuditLog`

### 2.6 `/approvals` — Multi-Tier Approval Matrix & Threshold Governance
- **Routes:** [`apps/api/src/modules/approvals/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/approvals/routes.ts)
  - `GET /`: List pending approvals assigned to authenticated user or whole organization.
  - `POST /:id/approve`: Approve invoice; enforces approval threshold policies and transitions invoice to `SCHEDULED`.
  - `POST /:id/reject`: Reject invoice with mandatory feedback; transitions invoice to `VALIDATION_FAILED` (no silent discard).
  - `POST /batch-approve`: Bulk approval for authorized finance managers across low-risk invoices.
- **Core Files:** `controller.ts`, `service.ts`, `thresholds.ts`
- **Prisma Models:** `Approval`, `Invoice`, `User`, `WorkflowInstance`

### 2.7 `/payments` — Disbursement Runs, Banking Rails & NACHA Generation
- **Routes:** [`apps/api/src/modules/payments/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/payments/routes.ts)
  - `GET /`: List scheduled, processing, and paid disbursements.
  - `POST /`: Schedule payment run with bank account assignment and target clearing date.
  - `POST /:paymentId/execute`: Execute disbursement with mandatory `Idempotency-Key` header; transitions invoice to `PAID`.
  - `POST /batch/run`: Execute batch disbursement run across multiple scheduled invoices.
  - `GET /export-file`: Generate bank-ready transmission files:
    - `format=nacha`: 94-character fixed-width ACH batch file conforming to NACHA specification.
    - `format=csv`: Host-to-host corporate banking CSV format.
    - Protected by `requireRole("ADMINISTRATOR", "FINANCE_MANAGER")`.
- **Conflict & Governance Guards (`payments/service.ts`):**
  - Throws `409 Conflict` if payment is already `PAID` (`"Payment has already been executed and is marked as PAID."`).
  - Throws `409 Conflict` if payment is not in `SCHEDULED` or `AWAITING_SCHEDULE` (`"Payment cannot be executed from status..."`).
  - Throws `403 Forbidden` if Segregation of Duties (SoD) is violated (the user who edited supplier bank coordinates cannot release payment).
  - **Live Gateway Status:** Payout execution currently uses simulated adapters (`RazorpayXAdapter`, `CashfreeAdapter`, `StripeAdapter`, `ManualBankAdapter`) generating simulated UTRs and clearing references; live third-party banking gating is deferred until production bank credentials are authenticated.
- **Core Files:** `controller.ts`, `service.ts`, `adapter.ts`, `bank-file-generator.ts`, `batch-runner.ts`
- **Prisma Models:** `Payment`, `Invoice`, `IdempotencyKey`

### 2.8 `/dashboard` — Operational KPIs & Executive Analytics
- **Routes:** [`apps/api/src/modules/dashboard/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/dashboard/routes.ts)
  - `GET /`: Overview metrics: total outstanding payables, overdue amounts, pending approval counts, exception volume, and cash outflow projection for 7/14/30 days.
- **Core Files:** `controller.ts`, `service.ts`
- **Prisma Models:** Aggregations across `Invoice`, `Payment`, `Exception`

### 2.9 `/reports` — AP Aging, Operational Reports & Cash Outflow
- **Routes:** [`apps/api/src/modules/reports/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/reports/routes.ts)
  - `GET /operational`: Operational performance KPIs (processing cycle time, touchless processing rate, exception rate).
  - `GET /aging`: AP Aging schedule broken into standard buckets (Current, 1–30, 31–60, 61–90, 90+ days).
  - `GET /cash-outflow`: Cash outflow schedule forecasting disbursement requirements.
- **Core Files:** `controller.ts`, `service.ts`

### 2.10 `/audit` — Immutable Forensic Audit Trail
- **Routes:** [`apps/api/src/modules/audit/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/audit/routes.ts)
  - `GET /`: Organization-wide immutable audit trail. Captures actor (`userId`), action, entity type, entity ID, `beforeData`, `afterData`, and timestamp.
  - Accessible only by `ADMINISTRATOR` and `FINANCE_MANAGER`.
- **Prisma Models:** `AuditLog`

### 2.11 `/integrations` & `/settings/integrations` — ERP Connectors
- **Routes:** [`apps/api/src/modules/integrations/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/integrations/routes.ts)
  - `GET /`: List configured accounting and ERP connectors.
  - `POST /:erp/connect`: Initialize connection credentials.
  - `POST /:erp/sync`: Trigger two-way sync for vendors, POs, and paid voucher journals.

### 2.12 `/billing` & `/settings/billing` — SaaS Subscriptions
- **Routes:** [`apps/api/src/modules/billing/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/billing/routes.ts)
  - `GET /subscription`: Current plan tier, active seats, invoice processing quota, renewal date.
  - `POST /checkout`: Upgrade or manage subscription billing.

### 2.13 `/public` — Unauthenticated Self-Service Vendor Tracking
- **Routes:** [`apps/api/src/modules/public/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/public/routes.ts)
  - `GET /invoices/track/:token`: Cryptographically validated public endpoint for vendors to check invoice clearance status, bank settlement date, and UTR number without requiring workspace credentials.
  - Pure read-only endpoint: performs zero state mutations or token re-minting on read.
- **Core Files:** `public-tracking.ts`, `crypto.ts`
- **Security:** Tokens are looked up via SHA-256 hash (`trackingTokenHash`); payloads are encrypted at rest with AES-256-GCM (`trackingTokenEncrypted`).

### 2.14 `/demo` — Interactive Persona Switcher & Sandbox Guards
- **Routes:** [`apps/api/src/modules/demo/routes.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/modules/demo/routes.ts)
  - `POST /reset`: Resets demo database state to seeded scenario for walkthroughs.
  - Guarded by `demo-reset-guard.ts`: Strictly disabled in production (`NODE_ENV === "production"` throws 403 Forbidden).

### 2.15 `/erp` — Multi-ERP Synchronization Engine
- **Module Path:** `apps/api/src/modules/erp/`
  - Adapters: `quickbooks.ts`, `xero.ts`, `sap.ts`, `netsuite.ts`, `tally.ts`.
  - Service: `service.ts` converts validated/paid invoice entities into canonical ERP Journal Vouchers, Accounts Payable Credit Memos, and Ledger balancing entries.
  - Current Status: Deterministic payload transformation and adapter stubs complete; live cloud OAuth APIs stubbed.

### 2.16 `/security` — Security Auditing & Static Policy Validation
- **Module Path:** `apps/api/src/modules/security/`
  - Controller & Service: Exposes internal security verification helpers and compliance assertions.
  - Test Suite: `prerelease-security.test.ts` validates tenant isolation, AST boundary integrity, and OWASP Top 10 defenses.

### 2.17 `/system` — Runtime Hygiene & Bundle Metrics
- **Module Path:** `apps/api/src/modules/system/`
  - Test Suite: `bundle-hygiene.test.ts` verifies zero leaking dev secrets, package tree safety, and memory stability.

### 2.18 `/users` — User Directory & Role Administration
- **Module Path:** `apps/api/src/modules/users/`
  - Service & Repository: Manages user status, organization assignments, and permission queries supporting `/auth/team/members`.

---

## 3. Workflow State Machine Architecture (`apps/api/src/workflow/`)

The Avarta workflow engine enforces a single-writer invariant (AGENTS.md Rule 4). Application controllers and services never write `workflow_instances.current_state` or `invoices.status` directly.

```mermaid
stateDiagram-v2
    [*] --> RECEIVED
    RECEIVED --> CAPTURED : CAPTURE_COMPLETE
    CAPTURED --> VALIDATING : VALIDATION_START
    VALIDATING --> VALIDATED : VALIDATION_SUCCESS
    VALIDATING --> VALIDATION_FAILED : VALIDATION_FAILURE
    VALIDATED --> MATCHING : MATCHING_START
    VALIDATION_FAILED --> VALIDATED : EXCEPTION_RESOLVED
    MATCHING --> WAITING_APPROVAL : MATCHING_SUCCESS
    MATCHING --> MATCHING_FAILED : MATCHING_FAILURE
    MATCHING_FAILED --> VALIDATED : EXCEPTION_RESOLVED
    WAITING_APPROVAL --> SCHEDULED : APPROVED
    WAITING_APPROVAL --> VALIDATION_FAILED : REJECTED
    SCHEDULED --> PROCESSING_PAYMENT : PAYMENT_RUN
    PROCESSING_PAYMENT --> PAID : PAYMENT_SUCCESS
    PROCESSING_PAYMENT --> SCHEDULED : PAYMENT_FAILURE
    PAID --> ERP_SYNC : ERP_SUCCESS
    ERP_SYNC --> ARCHIVED : ARCHIVE_COMPLETE
    ARCHIVED --> [*]
```

### 3.1 Resting States & FSM Reachability
The 14 canonical states defined in `apps/api/src/workflow/states.ts` and Prisma `WorkflowState` are:
`RECEIVED`, `CAPTURED`, `VALIDATING`, `VALIDATED`, `VALIDATION_FAILED`, `MATCHING`, `MATCHED`, `MATCHING_FAILED`, `WAITING_APPROVAL`, `SCHEDULED`, `PROCESSING_PAYMENT`, `PAID`, `ERP_SYNC`, `ARCHIVED`.

> **FSM Reachability Note on `MATCHED`:** In [`apps/api/src/workflow/transitions.ts:35`](file:///d:/Antigravity/ap-saas/apps/api/src/workflow/transitions.ts#L35), `MATCHING_SUCCESS` transitions directly from `MATCHING` to `WAITING_APPROVAL`. While `MATCHED` exists in the `WorkflowState` enum and string array for schema compatibility, it is an **inactive resting state** in the active transition graph.

### 3.2 10 UI Status Projections (`invoices.status`)
Internal engine states project into clear, simplified badges for finance users:
- `CAPTURED`, `VALIDATING`, `VALIDATED`, `MATCHING`, `MATCHED` $\rightarrow$ `PROCESSING`
- `VALIDATION_FAILED`, `MATCHING_FAILED` $\rightarrow$ `EXCEPTION`
- `WAITING_APPROVAL` $\rightarrow$ `PENDING_APPROVAL`
- `PROCESSING_PAYMENT` $\rightarrow$ `SCHEDULED`
- `ERP_SYNC` $\rightarrow$ `SYNCED`
- `RECEIVED`, `SCHEDULED`, `PAID`, `ARCHIVED` map 1:1.
- `APPROVED` and `REJECTED` are **transition events**, not resting engine states.

### 3.3 Rule 4 FSM Write Guard Proof
In [`apps/api/src/config/tenant-guard.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/config/tenant-guard.ts), a Prisma query extension intercepts every `update` and `updateMany` on `Invoice`. If `status` or `workflowState` is modified without an active `isEngineContext()` (established via `AsyncLocalStorage` inside `applyTransition`), the query throws an immediate error preventing unauthorized status mutations.

---

## 4. Data Layer, Tenant Isolation & Production Hardening

### 4.1 Multi-Tenant Isolation
- Every business model includes `organizationId` foreign key referenced to `Organization.id`.
- The `tenant-guard` query extension verifies that all `findUnique`, `findFirst`, `findMany`, `update`, `updateMany`, `delete`, and `deleteMany` operations explicitly filter by `organizationId`.
- Verified at build-time by an AST static code scanner (`tenant-guard-static.test.ts`) that traverses TypeScript AST trees to ensure no bare queries bypass the guard.

### 4.2 Database Connections: Pooled vs Direct
- **`DATABASE_URL` (Pooled):** Neon PgBouncer pooled connection with `?sslmode=require&pgbouncer=true&connection_limit=10`. Used for standard runtime Express queries to prevent connection exhaustion.
- **`DIRECT_URL` (Unpooled):** Direct Postgres connection endpoint configured in `schema.prisma` (`directUrl = env("DIRECT_URL")`). Used for Prisma migrations, advisory locks (`pg_advisory_lock`), and background backfill scripts.

### 4.3 Zero-Downtime Concurrent Migrations (`arity = 1`)
PostgreSQL wire protocol wraps multi-statement queries in an implicit transaction block, which throws `SQLSTATE 25001` if `CREATE INDEX CONCURRENTLY` is executed alongside other statements.
To prevent this, migrations are split into two single-statement migration directories with zero SQL comments:
1. `apps/api/prisma/migrations/20261024130000_add_invoice_compound_unique/migration.sql`:
   ```sql
   CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Invoice_id_organizationId_key" ON "Invoice"("id", "organizationId");
   ```
2. `apps/api/prisma/migrations/20261024130100_add_payment_compound_unique/migration.sql`:
   ```sql
   CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Payment_id_organizationId_key" ON "Payment"("id", "organizationId");
   ```

### 4.4 Cryptographic Storage & Key Validation
- [`apps/api/src/lib/crypto.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/lib/crypto.ts) implements authenticated AES-256-GCM encryption with 12-byte initialization vectors (IV) and 16-byte authentication tags.
- **Strict 64-Hex Format:** `APP_ENCRYPTION_KEY` is validated in `env.ts` as strictly 64 hexadecimal characters (`/^[0-9a-fA-F]{64}$/`). `crypto.ts` decodes directly via `Buffer.from(secret, "hex")`, throwing if format is invalid without fallback hashing.
- **Aggregated Boot Error Collection:** `validateEnvironment()` in `env.ts` accumulates all misconfigurations (missing URLs, invalid key formats, and `MASTER_DEV_*` production violations) into `missingOrInvalid[]`, throwing a unified error detailing all violations.

### 4.5 Financial Idempotency
- Mutating financial routes (`/payments/:paymentId/execute`, `/payments/batch/run`, `/invoices/:invoiceId/transitions`, `/erp-sync`) require an `Idempotency-Key` header.
- Handled by [`apps/api/src/middleware/idempotency.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/middleware/idempotency.ts): stores request hash in `IdempotencyKey` table for 24 hours, returning cached responses on duplicate network submissions.

---

## 5. apps/web — Route Map & Component Architecture

React 18 Single-Page Application configured with Vite, React Router v6, Tailwind CSS, and Radix UI primitives. All top-level routes are code-split via `lazy()` with Suspense fallbacks and idle prefetching.

### 5.1 Route Tree & Data Persistence Sources

| Route | Component | Access / Roles | Data Source / Backend Persistence |
| :--- | :--- | :--- | :--- |
| `/login` | `LoginPage.tsx` | Public | Backend `/api/v1/auth/login`. |
| `/signup` | `SignUpPage.tsx` | Public | Backend `/api/v1/auth/signup`. |
| `/forgot-password` | `ForgotPasswordPage.tsx` | Public | Backend `/api/v1/auth/password/forgot`. |
| `/reset-password` | `ResetPasswordPage.tsx` | Public | Backend `/api/v1/auth/password/reset`. |
| `/accept-invite` | `AcceptInvitePage.tsx` | Public | Backend `/api/v1/auth/invite/accept`. |
| `/track/:token` | `VendorInvoiceTrackPage.tsx` | Public | Backend `/api/v1/public/invoices/track/:token`. |
| `/privacy`, `/terms`, `/dpa`, `/subprocessors`, `/refund` | Public Legal Pages | Public | Static legal compliance documentation. |
| `/overview` | `OverviewPage.tsx` | Authenticated | Backend `/api/v1/dashboard`, `/api/v1/invoices`. |
| `/inbox` | `InboxPage.tsx` | Finance Roles | Backend `/api/v1/invoices` (upload, manual entry). |
| `/invoices` | `InvoicesPage.tsx` | Authenticated | Backend `/api/v1/invoices`. |
| `/invoices/:invoiceId` | `InvoiceDetailPage.tsx` | Authenticated | Backend `/api/v1/invoices/:id`, `/tracking`, `/tracking/regenerate`. |
| `/exceptions` | `ExceptionsPage.tsx` | Authenticated | Backend `/api/v1/exceptions`. |
| `/approvals` | `ApprovalsPage.tsx` | Approver / Finance | Backend `/api/v1/approvals`. |
| `/payments` | `PaymentsPage.tsx` | Finance Manager / Admin | Backend `/api/v1/payments`, `/payments/export-file`, `/batch/run`. |
| `/suppliers` | `SuppliersPage.tsx` | Authenticated | Backend `/api/v1/suppliers`. |
| `/purchase-orders` | `PurchaseOrdersPage.tsx` | Authenticated | Backend `/api/v1/purchase-orders`. |
| `/items` | `ItemsPage.tsx` | Authenticated | **Client-side persistent catalogue** (`apps/web/src/api/items.ts` with `localStorage` scoped to `avarta_items_catalogue_${orgId}`). |
| `/bank-accounts` | `BankAccountsPage.tsx` | Finance Manager / Admin | Configured corporate accounts linked to `/settings/integrations` & `/payments`. |
| `/reports` | `ReportsPage.tsx` | Finance Manager / Admin | Backend `/api/v1/reports/operational`, `/aging`, `/cash-outflow`. |
| `/archive` | `ArchivePage.tsx` | Authenticated | Filtered query on backend `GET /api/v1/invoices?status=ARCHIVED`. |
| `/settings` | `SettingsPage.tsx` | Administrator | Backend `/api/v1/auth/team`, `/settings/integrations`, `/billing`. |
| `/notifications` | `NotificationsPage.tsx` | Authenticated | **Client-side notification feed** (`INITIAL_NOTIFICATIONS` + `localStorage` webhook preferences; no dedicated backend REST route). |
| `/profile` | `ProfilePage.tsx` | Authenticated | User account details from authenticated session (`req.auth`). |

---

## 6. Features Present & Current Abilities Matrix

| Functional Area | Current Capabilities | Verification / Code Anchor |
| :--- | :--- | :--- |
| **Ingestion** | Multi-file drag & drop, file type validation (PDF/PNG/TIFF), OCR field extraction simulation, quick manual entry. | `InboxPage.tsx`, `invoices/routes.ts` |
| **Validation** | GST/Tax verification, duplicate invoice & amount detection, AI confidence scoring (High $\ge$95%, Med 80–94%, Low <80%). | `tax-validator.ts`, `confidence.test.ts` |
| **3-Way Matching** | Invoice lines matched against PO and Goods Receipt Notes (`GoodsReceipt`), tolerance variance checks. | `three-way-matching.test.ts` |
| **Exception Triage** | 14 canonical exception types, severity ranking (`CRITICAL` to `LOW`), assignment to team members, resolution audit notes. | `exceptions/service.ts`, `ExceptionsPage.tsx` |
| **Approvals** | Multi-tier threshold governance (<$1,000 auto, <$10,000 manager, >$10,000 multi-approver), batch approvals. | `thresholds.ts`, `approval-concurrency.test.ts` |
| **Disbursements** | Scheduled payment runs, direct banking settlement modal, client idempotency keys, NACHA ACH & CSV exports. Gateway adapters are simulated. | `PaymentsPage.tsx`, `bank-file-generator.ts` |
| **Vendor Self-Service** | Tokenized public status portal (`/track/:token`), zero-login verification of payment settlement and UTR reference. | `VendorInvoiceTrackPage.tsx`, `public-tracking.ts` |
| **Audit & Forensic** | Immutable `AuditLog` table with JSON before/after state diffs, P2025 standard error envelopes, SIEM logging with `req.auth`. | `error-handler.ts`, `audit-rbac.test.ts` |
| **ERP Integration** | Adapters for QuickBooks, Xero, SAP, NetSuite, Tally with journal mapping; live OAuth connections stubbed. | `erp-adapters.test.ts`, `erp/service.ts` |
| **Security Controls** | AST query-level tenant isolation, strict Rule 4 write guard, rate limiting, token revocation blacklist, AES-256-GCM. | `tenant-guard.ts`, `auth-security.test.ts` |

---

## 7. Automated Test Suite & Quality Gates

- **Test Runner:** Vitest with dynamic test reconciliation ([`apps/api/scripts/reconcile-tests.ts`](file:///d:/Antigravity/ap-saas/apps/api/scripts/reconcile-tests.ts)).
- **Current Verified Suite:** **217 passing unit & integration tests across 38 suites (0 failures).**
- **AST Tenant Security Scanner:** [`apps/api/src/config/tenant-guard-static.test.ts`](file:///d:/Antigravity/ap-saas/apps/api/src/config/tenant-guard-static.test.ts) parses all TypeScript files in `apps/api/src` to mathematically verify every Prisma query includes tenant scoping.
- **Type Safety:** Both `apps/api` and `apps/web` pass `tsc --noEmit` with zero errors.
- **End-to-End Suite:** Playwright tests in `apps/web/e2e/` covering authentication, invoice processing, exception resolution, and payment runs.

---

## 8. Product Roadmap Status (Alignment with Doc 16)

```text
PHASE 1: Foundation (Auth, Org, Users, RBAC, Database, Audit)                 [✓ COMPLETE & HARDENED]
PHASE 2: Invoice Intake (Upload, Storage, Inbox, Manual Entry)                [✓ COMPLETE & HARDENED]
PHASE 3: Invoice Intelligence [✓ MOCK OCR & DETERMINISTIC PARSING; LIVE CLOUD VISION STUBBED]
PHASE 4: Matching (Supplier, PO, Goods Receipt, Variance)                     [✓ COMPLETE & HARDENED]
PHASE 5: Exceptions (14 Types, Assignment, Resolution, Collaboration)         [✓ COMPLETE & HARDENED]
PHASE 6: Approvals (Rules, Sequential, Delegation, Batch Approve)             [✓ COMPLETE & HARDENED]
PHASE 7: Payments [✓ DISBURSEMENT RUNS & NACHA/CSV FILE EXPORT; GATEWAYS SIMULATED]
PHASE 8: ERP Sync [✓ MULTI-ERP ADAPTERS & VOUCHER MAPPING; LIVE OAUTH APIS STUBBED]
PHASE 9: Reporting & Archive (Aging, Cash Outflow, Immutable Archive)         [✓ COMPLETE & HARDENED]
PHASE 10: Enterprise Hardening (Tenant Guard, AES-256, Idempotency)           [✓ COMPLETE - Rehearsal Stage]
```

### Next Immediate Milestones:
1. **Neon Branch Rehearsal:** Run zero-downtime migration, backfill tracking tokens, and execute the 180-combination route sweep against an isolated Neon database branch.
2. **Production Release:** Apply concurrent compound unique indexes to production Postgres, inject `APP_ENCRYPTION_KEY` in Render, and trigger manual zero-downtime cutover via Render Deploy Hook.
3. **Item A: Multi-Org Switching:** Multi-tenant workspace switcher for finance executives managing multiple legal subsidiaries.
