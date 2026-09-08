# AGENTS.md — ClearOps AP Workspace

Read this file before making any change. It condenses an 18-document locked
product blueprint. If a request conflicts with something here, flag the
conflict instead of silently choosing one side.

## What this is

ClearOps AP Workspace — an Accounts Payable workspace for SMEs (10–500
employees). **Not** an ERP, **not** accounting software. It complements
existing accounting systems (QuickBooks, Xero, Tally, SAP, Oracle) rather
than replacing them.

## Non-negotiable product rules

1. **Workspace, not modules.** Every screen belongs to one stage of the
   linear workflow: Receive → Capture → Validate → Match → Exception →
   Approval → Payment → ERP Sync → Archive. Exceptions branch temporarily
   and always rejoin the main flow — never a permanent fork.
2. **AI suggests, humans decide.** No confidence level, ever, causes AI to
   write a value or advance workflow state without an explicit human click.
   This applies to every field, every module, every future feature. Do not
   add "auto-apply above threshold X" anywhere.
3. **Nothing is ever deleted.** Every entity is archived / deactivated /
   revoked / rejected instead. Confirmation dialogs never say "Delete."
4. **One invoice, one workflow state, one owner.** The Workflow Engine
   (`apps/api/src/workflow/`) is the only thing allowed to change
   `workflow_instances.current_state` or `invoices.status`. Application
   code, controllers, and the frontend must never write either field
   directly — `invoices.status` is a read-only projection maintained by
   the engine, not an independent source of truth.
5. **Financial operations require server confirmation.** No optimistic UI
   for approval, payment, or ERP sync. Idempotency keys are required on
   payment creation, payment execution, payment retry, batch processing,
   and ERP sync.
6. **Bulk actions never skip individual review** for anything that closes
   an exception or rejects an invoice. Bulk approve, schedule, and archive
   are fine; bulk resolve and bulk reject are not.
7. **Tenant isolation.** Every business table carries `organization_id`.
   Never trust `organizationId` from a request body — derive it from the
   authenticated session on every request.
8. **YAGNI.** This is a modular monolith on purpose. Do not introduce
   microservices, event-sourcing, GraphQL, a separate AI service, or a
   separate reporting warehouse unless a document explicitly asks for it.

## Canonical vocabulary (do not invent alternatives)

**Roles:** `Administrator`, `Finance Manager`, `Finance Executive`,
`Approver`, `Read Only`. No other role names exist.

**Navigation (11 items, sidebar order):** Overview, Inbox, Invoices,
Exceptions, Approvals, Payments, Suppliers, Purchase Orders, Reports,
Archive, Settings. Profile and Notifications are reached via the top bar,
not the sidebar. Audit is not a top-level page — it lives as a tab on
Invoice/Exception Details and as a section inside Settings.

**Invoice engine states** (`workflow_instances.current_state`):
`Received, Captured, Validating, Validated, Validation Failed, Matching,
Matched, Matching Failed, Waiting Approval, Scheduled, Processing Payment,
Paid, ERP Sync, Archived`. `Approved`/`Rejected` are transition events, not
resting states.

**Invoice UI status** (`invoices.status`, denormalized projection):
`RECEIVED, PROCESSING, EXCEPTION, PENDING_APPROVAL, APPROVED, REJECTED,
SCHEDULED, PAID, SYNCED, ARCHIVED`.

**Payment status** (`payments.status`): `AWAITING_SCHEDULE, SCHEDULED,
PROCESSING, PAID, FAILED, ON_HOLD`.

**Exception types (14):** `MISSING_PO, UNKNOWN_VENDOR, DUPLICATE_INVOICE,
DUPLICATE_AMOUNT, TAX_DIFFERENCE, CURRENCY_MISMATCH, PRICE_DIFFERENCE,
QUANTITY_DIFFERENCE, MISSING_SIGNATURE, INVALID_GST, LOW_AI_CONFIDENCE,
MISSING_REQUIRED_FIELD, FRAUD_RISK, MANUAL_REVIEW`.

**AI confidence bands:** High ≥95% (pre-fill + one-click accept, still
requires the click), Medium 80–94% (recommendation, requires confirmation),
Low <80% (manual entry, nothing pre-filled).

## Architecture

```
apps/api    Express + TypeScript + Prisma + PostgreSQL
            Layered: controller → service → repository → database
            Workflow Engine and AI live outside modules/, never inside them
apps/web    React + TypeScript + Vite + Tailwind
            Design tokens in src/design-system/tokens.ts — components
            consume tokens only, never raw hex/px values
```

Every backend module follows the same file shape:
`controller.ts, service.ts, repository.ts, routes.ts, validation.ts,
mapper.ts`. Controllers contain no business logic. Repositories contain no
workflow decisions. The workflow engine contains no HTTP code.

## Design system quick reference

Accent: Indigo `#4F46E5`. Status: success `#16A34A`, warning `#D97706`,
error `#DC2626`, info `#2563EB`, neutral `#6B7280` — color is never the
only status indicator, always paired with text/icon. Type: Inter, weights
400/500/600 only, tabular figures for all money. Spacing: 4px grid. Radius:
4/6/8/12px scale. No decorative motion — animation only communicates state
change. WCAG 2.2 AA is the accessibility floor. Full spec:
`docs/08-design-system.md`.

## Full spec set

The complete 18-document blueprint (vision, workflow, IA, every module
spec, the design system, workflow engine, AI behavior, state management,
backend architecture, database schema, API contracts, UX heuristics,
roadmap, and this reconciliation pass) lives in `docs/`. When in doubt
about a product decision, read the relevant doc there before guessing —
almost everything has already been decided.

## What is deliberately not built yet

This scaffold implements a working vertical slice: auth, invoice
list/detail/upload (mocked OCR), suppliers, dashboard, and a minimal
workflow engine covering the core happy path plus exceptions. Approvals
and payments have real schema and basic list endpoints but not full
routing/threshold logic yet. Reports, Settings, Purchase Orders, Audit-as-
a-tab, and full AI extraction are stubbed. See `docs/16-roadmap.md` for the
intended build order — follow it rather than building modules out of
sequence.
