# 18. Reconciliation & Canonical Reference

**Version:** 1.0 (Locked)
**Status:** Correction Pass — applies retroactively across Documents 1–17
**Purpose:** Resolve every cross-document inconsistency surfaced during the review of the ClearOps blueprint series, and establish one canonical answer for each.

---

# How to Read This Document

Documents 1–17 remain locked and authoritative **except** where this document explicitly supersedes them. Each section below states:

```text
Conflict          → what disagreed, and where
Canonical Answer  → the single answer going forward
Supersedes        → which prior documents/sections are corrected
```

If a future document contradicts something decided here, this document wins unless explicitly re-opened.

---

# 18.1 Canonical Roles

## Conflict

Two incompatible role vocabularies existed:

```text
Doc 05 / Doc 13 (schema) / all 14 module specs
    Administrator, Finance Manager, Finance Executive, Approver, Read Only

Appendix F (Doc 16)
    Admin, AP Clerk, AP Manager, Approver, Finance Manager
```

## Canonical Answer

The **original five-role model is authoritative**, since every permission table across every module spec (06.1–06.14) and the database `roles` seed data (Doc 13) was built against it. Appendix F's naming is retired. Where Appendix F's intent was to distinguish operational staff from managerial oversight, that distinction already exists between `Finance Executive` (operational, no approval authority) and `Finance Manager` (full access) — no new roles are needed.

```text
Canonical Roles
────────────────────────────────────────────
Administrator       Full system access, including Settings.
Finance Manager      Full operational access across every module.
Finance Executive     Operational access; cannot approve, cannot access Settings.
Approver               Approvals + read access to related invoices; no edit rights.
Read Only                View-only across permitted modules. Not yet explicitly
                         assigned anywhere in the series — reserved for auditors,
                         external accountants, or leadership visibility (this is
                         the natural home for the "CFO" / "Finance Director"
                         personas mentioned in Doc 06.11 and Doc 06.12 — they are
                         Read Only users, not new roles).
```

## Mapping (if Appendix F terms appear in future work)

```text
Admin           → Administrator
AP Clerk        → Finance Executive
AP Manager      → Finance Manager
Approver        → Approver (unchanged)
Finance Manager → Finance Manager (unchanged)
```

## Supersedes

Appendix F (Document 16). All other role references across Documents 1–15 are already correct and unchanged.

---

# 18.2 Canonical Navigation Model

## Conflict

Two navigation lists existed:

```text
Doc 05 (originally locked, 12 items)
    Dashboard, Inbox, Invoices, Exceptions, Approvals, Payments,
    Suppliers, Purchase Orders, Reports, Audit, Integrations, Settings

Folder Structure doc / Doc 15 (§15.38) / Appendix G (Doc 16) — three
independent documents, all agreeing (11 items)
    Overview, Inbox, Invoices, Exceptions, Approvals, Payments,
    Suppliers, Purchase Orders, Reports, Archive, Settings
```

## Canonical Answer

The **11-item model is adopted** as the final navigation, since it was arrived at independently three separate times, and its simplifications are individually justifiable:

```text
Canonical Sidebar
────────────────────────────────────────────
Overview            (renamed from "Dashboard" — same page, same spec
                      as Doc 06.1; the operational "mission control"
                      framing fits "Overview" better than "Dashboard,"
                      which the product deliberately avoids resembling)
Inbox
Invoices
Exceptions
Approvals
Payments
Suppliers
Purchase Orders
Reports
Archive             (newly promoted to a first-class nav item — Archived
                     is a real, high-volume terminal state; users need
                     direct access without filtering it out of Invoices)
Settings
```

**Audit** and **Integrations** are removed as standalone top-level pages:

- **Audit** already exists as: a tab on Invoice Details (06.4) and Exception Details (06.6), a section within Settings (06.12, "Audit Logs"), and a scoped API (`GET /:entityType/:entityId/audit`, Doc 14). A dedicated top-level Audit page was fully redundant with these. Users reach audit history through the entity it belongs to, or through Settings for system-wide administrative history.
- **Integrations** already exists as a full section within Settings (06.12) with its own API (Doc 14, §14.27). It does not need duplicate top-level billing.

**Profile** and **Notifications** remain non-sidebar pages, reached via the top navigation (avatar menu / bell icon respectively) — this was already correct and consistent in Docs 06.13 and 06.14; no change needed.

## Data Model Impact

No schema change required — `audit_logs` (Doc 13, table 31) already supports both entity-scoped and organization-wide queries via `entity_type` + `entity_id` filtering.

## Supersedes

Document 05's original 12-item Locked Information Architecture and Locked Decisions. Document 05's page-hierarchy content (one detail page per module, global layout, component reuse) remains fully valid — only the top-level item count and two item names change.

---

# 18.3 Canonical Invoice State Machine

## Conflict

Four independently-worded state lists existed for the same lifecycle:

```text
Doc 04 (business stages, 9 stages)
    Received → Captured → Validated → Matched → Exception →
    Approved → Payment → ERP Sync → Archive

Doc 09 (engine FSM, 15 states)
    Received, Captured, Validating, Validation Failed, Validated,
    Matching, Matching Failed, Waiting Approval, Approved, Rejected,
    Scheduled, Processing Payment, Paid, ERP Sync, Archived

Doc 13 (schema enum, invoices.status, 10 values)
    RECEIVED, PROCESSING, EXCEPTION, PENDING_APPROVAL, APPROVED,
    REJECTED, SCHEDULED, PAID, SYNCED, ARCHIVED

Appendix B (Doc 16, 14 states, introduces "READY FOR PAYMENT")
    RECEIVED → PROCESSING → VALIDATED → MATCHED/EXCEPTION →
    UNDER REVIEW → RESOLVED → PENDING APPROVAL → APPROVED/REJECTED →
    READY FOR PAYMENT → SCHEDULED → PAYMENT PROCESSING → PAID →
    ERP SYNCED → ARCHIVED
```

Additionally, Doc 09's own Transition Rules table omitted entry/exit rows for its own declared `Matching` and `Matching Failed` states.

## Canonical Answer

Doc 09's engine FSM is authoritative for backend implementation — it's the most granular and the only one with a full state machine intent. Doc 13's `invoices.status` is retained as a **denormalized, engine-maintained projection** for API/UI convenience (see 18.7), collapsed to fewer values on purpose. Appendix B's `READY FOR PAYMENT` is dropped — Doc 09's `Approved` state already implies payment-eligibility; no separate resting state exists between approval and scheduling in the actual workflow (Doc 04: "Payment is required before ERP sync... Approval is required before payment," with no intermediate stage described anywhere else).

```text
Canonical Engine States (workflow_instances.current_state)
────────────────────────────────────────────────────────────
Received
Captured
Validating
Validated
Validation Failed      (→ Exception Queue)
Matching
Matched
Matching Failed         (→ Exception Queue)
Waiting Approval
Approved                (event-only transition marker, see below)
Rejected                (event-only transition marker, see below)
Scheduled
Processing Payment
Paid
ERP Sync
Archived
```

`Approved` and `Rejected` are **transition events, not resting states** — an invoice is never observed sitting in either; it moves through instantaneously to `Scheduled` or `Validation Failed` respectively. They remain in `workflow_transitions.event` values, not as values an invoice can hold at rest.

## Corrected Transition Table (fills Doc 09's gap)

```text
Current State        | Event                | Next State
──────────────────────────────────────────────────────────────
Received              | Capture Complete      | Captured
Captured               | Validation Start       | Validating
Validating              | Success                 | Validated
Validating               | Failure                  | Validation Failed
Validated                 | Matching Start            | Matching
Validation Failed          | Resolved                   | Validated
Matching                    | Success                     | Waiting Approval
Matching                     | Failure                      | Matching Failed
Matching Failed                | Resolved                      | Validated
Waiting Approval                 | Approved (event)                | Scheduled
Waiting Approval                  | Rejected (event)                 | Validation Failed
Scheduled                          | Payment Run                       | Processing Payment
Processing Payment                  | Success                            | Paid
Processing Payment                   | Failure                             | Scheduled *
Paid                                  | ERP Success                          | ERP Sync
ERP Sync                               | Complete                              | Archived
```

`*` Payment failure: the **engine state** reverts to `Scheduled` for retry eligibility, but the **payment record's own status** (`payments.status = FAILED`) is retained separately with `failure_reason` populated (see 18.5) — so the failure is never silently lost even though the invoice's workflow state returns to a prior point.

## UI Status Label Mapping

```text
Engine State           UI Label (across 06.x specs)      DB status enum
──────────────────────────────────────────────────────────────────────
Received               Received / Processing              RECEIVED
Captured                Processing                          PROCESSING
Validating               Processing                           PROCESSING
Validated                 Review                                PROCESSING
Validation Failed          Exception                             EXCEPTION
Matching                    Review                                 PROCESSING
Matched                      Review                                  PROCESSING
Matching Failed                Exception                              EXCEPTION
Waiting Approval                 Waiting Approval                       PENDING_APPROVAL
Scheduled                         Scheduled                              SCHEDULED
Processing Payment                 Scheduled                              SCHEDULED
Paid                                 Paid                                    PAID
ERP Sync                              Paid                                    SYNCED
Archived                                Archived                                ARCHIVED
```

Note: several distinct engine states collapse to the same UI label and DB status deliberately — users don't need to distinguish "Validating" from "Matching" in the UI; both read as "Review" or "Processing." This is expected, not an error — it's exactly the "backend state machine vs. user-facing status label" split flagged during the 06.3 and 06.8 reviews, now made explicit.

## Supersedes

Appendix B (Document 16) in full. Fills the gap in Document 09's Transition Rules table. Document 13's `invoices.status` remains as-is, now formally documented as a projection rather than an independent field (see 18.7).

---

# 18.4 Canonical Exception Model

## Conflict

Exception **types**: Doc 06.5 locked 12 types; Doc 13's schema enum has 10, missing four (`Duplicate Amount`, `Price Difference`, `Quantity Difference`, `Low AI Confidence`) and adding one not in the original list (`FRAUD_RISK`, sourced from Doc 10's AI capabilities).

Exception **resolution paths**: Doc 06.6 locked "Retry Validation is the only resolution path" and "Exception cannot be manually closed" — but Doc 14's API defines `POST /exceptions/:id/resolve` with a free-text `resolution` field, and Appendix C (Doc 16) introduces a `Rejected` exception outcome that doesn't exist in 06.5/06.6 at all.

## Canonical Answer — Types

```text
Canonical Exception Types
────────────────────────────────────────────
MISSING_PO
UNKNOWN_VENDOR
DUPLICATE_INVOICE
DUPLICATE_AMOUNT
TAX_DIFFERENCE
CURRENCY_MISMATCH
PRICE_DIFFERENCE
QUANTITY_DIFFERENCE
MISSING_SIGNATURE
INVALID_GST
LOW_AI_CONFIDENCE
MISSING_REQUIRED_FIELD
FRAUD_RISK
MANUAL_REVIEW
```

`DUPLICATE_INVOICE` and `DUPLICATE_AMOUNT` are kept distinct (Doc 06.5's original intent) rather than merged. `FRAUD_RISK` is retained from Doc 13/Doc 10 as a legitimate addition. This is now a 14-value enum; Doc 13's `exceptions.type` column should be updated to match.

## Canonical Answer — Resolution Paths

Doc 06.6's "only resolution path" language is corrected. Three legitimate resolution paths exist, and the API (Doc 14) was right to support more than one:

```text
Path 1 — Automatic (primary)
    Retry Validation succeeds → engine transitions the invoice
    automatically → exception closes without a separate user action.

Path 2 — Manual resolution with documented reason
    POST /exceptions/:id/resolve — used when the underlying issue was
    confirmed correct outside the system (e.g. "confirmed with
    procurement by phone; PO will be backfilled"). Requires a
    non-empty `resolution` note. This does NOT bypass validation —
    it still triggers Retry Validation server-side before the
    exception is actually allowed to close (protects the "cannot be
    manually closed without re-validation" spirit of 06.6 while
    allowing a human explanation to accompany it).

Path 3 — Rejection (terminal, new)
    Some exceptions cannot be resolved (e.g. a confirmed duplicate,
    or a vendor that genuinely doesn't exist). These reject the
    underlying invoice rather than resolve the exception — the
    invoice moves to its own Rejected/Validation Failed state
    (18.3) with the exception marked closed-by-rejection, not
    closed-by-fix. This is Appendix C's addition, now formalized.
```

## Corrected UI Copy for Document 06.6

Replace: *"Retry Validation is the only resolution path"*
With: *"Resolution requires either a successful validation retry, or a manually documented resolution that itself triggers a validation retry before closing. Exceptions that cannot be resolved may instead reject the invoice."*

## Supersedes

Document 06.6's Business Rules and Locked Decisions (the "only resolution path" clauses). Document 13's `exceptions.type` enum (expand to 14 values). Appendix C (Document 16) is formalized rather than replaced.

---

# 18.5 Canonical Payment State

## Conflict

Doc 09's engine FSM reverts payment failure straight back to `Scheduled` with no distinct failed state. Doc 06.8's UI and Doc 13's schema both independently (and identically) define `payments.status` with a real `FAILED` value that "remains in the payment queue" until addressed. Appendix E (Doc 16) adds yet another version with a `READY` starting state, a `PAYMENT RUN` state, and routes failure to `REVIEW` rather than `Scheduled` or `FAILED`.

## Canonical Answer

`payments.status` (Doc 13's enum, already matching Doc 06.8's UI exactly) is authoritative and unchanged:

```text
AWAITING_SCHEDULE → SCHEDULED → PROCESSING → PAID
                                      │
                                      └──→ FAILED (retryable, visible,
                                            carries failure_reason)
                                      │
                          also: ON_HOLD (from SCHEDULED, reversible)
```

The invoice's **engine state** (18.3) reverting to `Scheduled` on payment failure is compatible with this — it reflects that the *invoice* is still eligible for another payment attempt, while the *specific failed payment record* keeps its own terminal `FAILED` status with the failure reason preserved for the user to see and act on (Doc 06.8's "failed payments remain in the payment queue"). These are two different objects (invoice vs. payment) tracking two different things, not a contradiction once separated.

Appendix E's `READY` and `PAYMENT RUN` states, and its `REVIEW` failure destination, are dropped — `AWAITING_SCHEDULE` already covers "ready," "Payment Run" is an action/batch concept (Doc 06.8, Doc 14 §14.19) not a payment status, and routing failures to a payment queue with visible `FAILED` status (rather than a separate review state) is simpler and already fully specified.

## Supersedes

Appendix E (Document 16) in full.

---

# 18.6 AI Confidence Thresholds

## Conflict

Document 10 (authoritative AI spec) locked **95% / 80%** bands. Document 08 (§8.26, written before Doc 10's numbers were known) used **90% / 70%**.

## Canonical Answer

Document 10's thresholds are authoritative. Document 08 §8.26 is corrected to:

```text
AI Confidence Badge
    ≥ 95%    success token, "High confidence"
    80–94%   warning token, "Review recommended"
    < 80%    error token, "Low confidence — verify"
```

## Second, larger correction — auto-processing at high confidence

Document 10 also stated: *"High (95–100%): Auto-process if workflow permits."* This directly contradicts the "AI suggests, humans decide" principle stated as absolute and non-negotiable in at least six other locked documents (Doc 02, Doc 06.4, Doc 06.6, Doc 10's own Design Principles, Doc 16 Appendix I). Given the overwhelming precedent, **the auto-process clause is removed**:

```text
Canonical AI Confidence Behavior
────────────────────────────────────────────
≥ 95%     Field is pre-filled and visually deemphasized as
           "high confidence" with a single-click Accept — but
           still requires that explicit user click. Never
           auto-applied without it.
80–94%     Shown as a recommendation requiring confirmation,
            standard AI Suggestion Card treatment.
< 80%       Manual review required; no suggested value is
             pre-filled into the field.
```

No confidence level, at any threshold, causes AI to write a value or advance workflow state without an explicit human action. This applies system-wide, with no exceptions — including for future features.

## Supersedes

Document 08 §8.26 (threshold numbers). Document 10's "Auto-process if workflow permits" line under AI Confidence Levels → High.

---

# 18.7 Data Model Correction: Status vs. Workflow State

## Conflict

`invoices.status` and `workflow_instances.current_state` are two separately-writable fields tracking overlapping information for the same invoice (Doc 13), both independently returned by the API (Doc 14, `GET /invoices`). Nothing in either document prevents them from drifting out of sync.

## Canonical Answer

`workflow_instances.current_state` is the single source of truth (matches Doc 09: "Workflow Engine owns state transitions... UI never changes workflow directly"). `invoices.status` becomes a **read-only, denormalized projection**, written only by the Workflow Engine as a side effect of every transition — application code and API consumers may read it but must never write it directly. Document 14 §14.34 ("Workflow Protection") already blocks this at the API layer via `PATCH /invoices/:id`; this section formalizes the same rule at the schema/service layer.

```text
Recommended implementation note (non-binding on stack choice):
    invoices.status is updated inside the same database transaction
    as workflow_instances.current_state, by the Workflow Engine's
    transition handler only — never by invoice.service.ts directly.
```

## Supersedes

Nothing structurally — Document 13's schema is unchanged. This section adds the missing governing rule Document 13 and Document 14 implied but never stated explicitly.

---

# 18.8 Design System Corrections

## Accessibility Target

```text
Conflict            Doc 08 §8.15 locked WCAG 2.1 AA;
                      Doc 15 §15.47 locked WCAG 2.2 AA.

Canonical Answer     WCAG 2.2 AA (the newer, superset standard).
                      Doc 08 §8.15 is corrected accordingly.
```

## Chart Scope (already resolved, restated for completeness)

Document 08 §8.19 already corrected Document 07's "charts in Reports and Dashboard" to "Reports only." No further change — restated here so this document is a complete index of corrections.

## Confirmation Dialog Triggers (already resolved, restated for completeness)

Document 08 §8.23 already corrected Document 07's inclusion of "Delete" as a Confirmation Dialog trigger (no entity in ClearOps is ever deleted). No further change.

## Supersedes

Document 08 §8.15 (WCAG version number only).

---

# 18.9 Folder Structure Correction

## Conflict

The `apps/web/src/pages/` folder (Document 27) listed `archive/` but was missing `audit/`, `integrations/`, `profile/`, and `notifications/` — out of step with both the original Doc 05 IA and the actual set of specced pages (06.13, 06.14).

## Canonical Answer

Given the navigation model adopted in 18.2, the corrected page folder list is:

```text
pages/
├── overview/          (renamed from dashboard/)
├── inbox/
├── invoices/
├── exceptions/
├── approvals/
├── payments/
├── suppliers/
├── purchase-orders/
├── reports/
├── archive/
├── settings/
├── profile/            (non-sidebar, reached via avatar menu)
└── notifications/       (non-sidebar, reached via bell icon)
```

`audit/` and `integrations/` are **not** separate page folders — per 18.2, they live inside `settings/` (integrations, audit-logs as sub-routes) and as components reused within `invoices/` and `exceptions/` detail views (audit tabs).

## Supersedes

Document 27's `pages/` folder listing.

---

# 18.10 Terminology & Minor Clarifications

## API Tokens (two locations, now disambiguated)

```text
Settings → Security → API Tokens     Organization-level service/integration
                                       credentials, managed by Administrators.
                                       Rename in UI copy to "Service Tokens"
                                       to avoid confusion with the personal
                                       tokens below.

Profile → API Tokens                  Personal, per-user API credentials
                                        (Doc 06.13). Unchanged.
```

## Retention Policy (previously undefined dependency)

Document 06.14 referenced "the organization's retention policy" with no defined home. Document 13's `organization_settings` (a flexible key-value table) already supports this without a schema change — add `retention_days` (or equivalent, per entity type if needed) to the settings examples list in both Document 06.12 and Document 13.

## Suppliers Page Permission Wording (Document 06.9)

`Finance Manager: View, Edit, Create, Archive` should be read as equivalent to the "Everything" wording used in every other module — no functional gap, just inconsistent phrasing. No correction needed beyond this note. Separately, the Bulk Action Bar shows `Export, Archive` while `Finance Executive` is only granted `View, Export` — the Archive button should be hidden/disabled for that role in the bulk bar, matching their permission row.

## Notifications Entry Point (Document 06.14)

"Sidebar" listed as an entry point is corrected to match Document 06.13's pattern (avatar/bell icon in top navigation, not sidebar) — consistent with 18.2's navigation model, where Notifications was never a sidebar item.

---

# 18.11 Locked Decisions — Full Correction Summary

```text
✓ Canonical roles: Administrator, Finance Manager, Finance Executive,
   Approver, Read Only. Appendix F's alternate naming retired.

✓ Canonical navigation: Overview, Inbox, Invoices, Exceptions,
   Approvals, Payments, Suppliers, Purchase Orders, Reports, Archive,
   Settings (11 items). Audit and Integrations are not top-level pages.

✓ Canonical engine state machine per 18.3, with the Matching /
   Matching Failed transition gap filled and Approved/Rejected
   reclassified as transition events, not resting states.

✓ Canonical exception type enum: 14 values, per 18.4.

✓ Canonical exception resolution: three paths (automatic retry,
   documented manual resolution requiring re-validation, or
   rejection of the underlying invoice).

✓ Canonical payment status: Doc 13/06.8's AWAITING_SCHEDULE →
   SCHEDULED → PROCESSING → PAID/FAILED/ON_HOLD, unchanged and
   confirmed authoritative.

✓ Canonical AI confidence thresholds: 95% / 80%, matching Doc 10.

✓ No AI auto-processing at any confidence level, ever, without an
   explicit human action — the "High confidence auto-process" clause
   is removed system-wide.

✓ invoices.status is a read-only projection maintained solely by the
   Workflow Engine; workflow_instances.current_state is the single
   source of truth.

✓ Accessibility target: WCAG 2.2 AA (superseding Doc 08's 2.1 AA).

✓ Folder structure pages/ list corrected to match the canonical
   navigation model, including profile/ and notifications/.

✓ API Tokens disambiguated: "Service Tokens" (org-level, Settings)
   vs. "API Tokens" (personal, Profile).

✓ Retention policy lives in organization_settings; add explicit
   examples to Doc 06.12 and Doc 13.

This document, together with Documents 1–17 as modified above,
constitutes the complete, internally consistent V1 blueprint.
```
