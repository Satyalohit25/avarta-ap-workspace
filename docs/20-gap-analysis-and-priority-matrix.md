# 20. Gap Analysis & Operational Priority Matrix

**Version:** 1.0 (Active)  
**Status:** Living Execution Document  
**Reference:** Complements Documents 01–19, locked blueprint rules in `AGENTS.md`, and `docs/18-reconciliation-and-canonical-reference.md`.

---

## Executive Summary

ClearOps AP Workspace has established its core foundation: a unified design system, multi-tenant Prisma schema, Express backend architecture, React frontend workstation, and a deterministic workflow finite-state machine (FSM).

To transition from the current vertical slice to an enterprise-ready, audit-proof production deployment for SMEs, this document outlines the **unimplemented gaps**, categorized into four operational priorities:
1. **Critical:** System stability, financial idempotency, and non-negotiable security/state invariants.
2. **Urgent:** Core workflow milestones required for full V1 operational completion.
3. **Important:** System resilience, real external integrations, and compliance reporting.
4. **Fast Wins:** High-leverage, low-complexity enhancements that immediately elevate operator velocity and product delight.

---

## The Priority Matrix Overview

```
                      IMPACT
                        ▲
                        │
         [URGENT]       │       [CRITICAL]
    • Audit-as-a-Tab    │   • DB-Backed Idempotency
    • 3-Way Match Logic │   • Approval Threshold Engine
    • Payment Batch Run │   • FSM Guard Enforcement
    • ERP Sync Adapter  │   • Strict Tenant Query Linter
                        │
  ──────────────────────┼────────────────────────► EFFORT /
                        │                          URGENCY
        [FAST WINS]     │       [IMPORTANT]
    • Keyboard Nav (J/K)│   • Real Document AI OCR
    • CSV/NACHA Export  │   • GSTIN/VAT Checksum Check
    • PDF Box Overlay   │   • AP Aging & DPO Analytics
    • Quick Filter Chips│   • Inbound Email Ingestion
                        │
```

---

## 1. CRITICAL (Must Have Before Any Real Money Moves)

Items that, if left unaddressed, could lead to duplicate payments, state corruption, security breaches, or regulatory non-compliance.

| Item | Current State | Target Requirement | Impact |
| :--- | :--- | :--- | :--- |
| **1.1 DB-Backed Idempotency Store** | In-memory header checking or ephemeral storage. | Persisted `idempotency_keys` table in PostgreSQL with atomic `SERIALIZABLE` or `SELECT FOR UPDATE` locks. Expire after 24 hours. | Prevents duplicate bank debits if a network timeout occurs during a payment run. |
| **1.2 Approval Policy & Threshold Engine** | Simple binary approve/reject endpoint without role limit enforcement. | Multi-tier evaluation engine: <br>• `< $1,000`: Finance Executive<br>• `$1,000–$10,000`: Finance Manager<br>• `> $10,000`: Dual approval (FM + Administrator). | Blocks unauthorized disbursement; satisfies SOX / internal controls. |
| **1.3 Workflow Engine Transition Guards** | Controller can call repository updates or transition steps directly. | Enforce that *all* status changes must pass through `workflow/engine.ts`. The repository rejects direct writes to `invoices.status`. | Guarantees the single source of truth invariant; eliminates out-of-order states. |
| **1.4 Strict Multi-Tenant Query Validation** | `organizationId` passed in controllers. | Automated Prisma query middleware or linting gate ensuring *every* find, update, and delete query includes `where: { organizationId }`. | Eliminates accidental cross-tenant data leakage. |

---

## 2. URGENT (V1 Core Workflow Completion)

Features required to close the loop from invoice receipt to general ledger archive.

| Item | Component | Specification | Deliverable |
| :--- | :--- | :--- | :--- |
| **2.1 Audit-as-a-Tab** | `apps/web` & `apps/api` | Tab on Invoice Details and Exception Details rendering immutable chronological logs: timestamp, actor name, action, state change, and IP address. | Full visual audit timeline component. |
| **2.2 3-Way Match Tolerance Engine** | `apps/api/src/workflow/matcher.ts` | Compare Invoice Lines against PO Lines and Goods Receipts. Configurable price tolerance (e.g. ±2%) and quantity tolerance (0%). Auto-flag `PRICE_DIFFERENCE` or `QUANTITY_DIFFERENCE`. | Automated matching service before approval routing. |
| **2.3 Payment Batch Execution Runner** | `apps/api/src/modules/payments/worker.ts` | Scheduled job running hourly: selects all invoices in `SCHEDULED` status where `scheduled_date <= NOW()`, advances them to `PROCESSING_PAYMENT`, and generates payment settlement batches. | Automated execution of scheduled disbursements. |
| **2.4 ERP Sync Adapter & Export Queue** | `apps/api/src/modules/erp/` | Pluggable interface for accounting platforms (QuickBooks Online, Xero, NetSuite, CSV generic). Produces journal entry payloads and marks invoice `SYNCED`. | Standardized general ledger sync worker. |

---

## 3. IMPORTANT (Product Depth, Intelligence & Compliance)

Capabilities that transform ClearOps from a manual workflow tool into an intelligent, automated workspace.

| Item | Component | Specification | Benefit |
| :--- | :--- | :--- | :--- |
| **3.1 Live OCR & Document AI Integration** | `apps/api/src/ai/` | Replace simulated extraction with AWS Textract, Google Document AI, or Azure Form Recognizer, returning bounding box coordinates `[x, y, w, h]` and confidence scores. | True touchless document intake. |
| **3.2 Algorithmic Tax ID & Bank Validation** | `apps/api/src/modules/suppliers/` | Checksum verification for tax identification numbers (Indian GSTIN, EU VAT via VIES API, US EIN). Bank routing number (ABA) check. | Eliminates vendor fraud and invalid tax filing. |
| **3.3 AP Aging & Cash Outflow Analytics** | `apps/web/src/pages/reports/` | Dynamic calculations: AP Aging Buckets (Current, 1–30, 31–60, 61–90, 90+ days), Days Payable Outstanding (DPO), and cash requirement forecast. | CFO visibility into weekly liquidity requirements. |
| **3.4 Inbound Email Intake Worker** | `apps/api/src/modules/inbox/worker.ts` | Dedicated IMAP / SendGrid / Postmark inbound parser that accepts PDF attachments from `invoices@company.clearops.io` and writes to Inbox. | Zero manual upload friction for suppliers. |

---

## 4. FAST WINS (High Impact, Low Effort, Immediate Delight)

Quality-of-life and productivity boosters that can each be implemented in under a day.

### 4.1 Keyboard-Driven Workstation Navigation
* **Keys:** `J` (Next invoice), `K` (Previous invoice), `A` (Approve), `R` (Reject), `E` (Open Exception), `/` (Focus search), `Esc` (Close modal/drawer).
* **Impact:** Power finance users can process an approval batch in seconds without touching the mouse.

### 4.2 Standard CSV / NACHA Export for Payment Batches
* **Deliverable:** "Export Bank File" dropdown on `PaymentsPage.tsx` supporting:
  1. Standard CSV (Vendor, Account #, Routing #, Amount, Invoice Ref)
  2. Generic NACHA format for US ACH batch processing.
* **Impact:** Allows finance teams to immediately execute payments via their existing bank portal without waiting for direct API bank integrations.

### 4.3 Visual Bounding-Box Overlay on Invoice Viewer
* **Deliverable:** When hovering over an extracted field in `AIExtractedDetailsCard.tsx`, draw a subtle Indigo `#4F46E5` bounding box over the corresponding region on the PDF viewer canvas.
* **Impact:** Instant visual verification of AI extraction; eliminates eye fatigue.

### 4.4 Quick-Filter Horizon Chips on Invoices Page
* **Deliverable:** One-click filter chips above the invoice grid:
  * `[ Due in < 48 Hours ]`
  * `[ Missing PO ]`
  * `[ Over $5,000 ]`
  * `[ High Confidence (Ready to Validate) ]`
* **Impact:** Reduces filtering friction and surfaces urgent deadlines instantly.

### 4.5 Bulk Schedule Action in Payments
* **Deliverable:** Multi-select invoices in `AWAITING_SCHEDULE` status → Click "Schedule Selected" → Pick date (e.g. "Next Friday Payment Run") → Server assigns all in one idempotent transaction.
* **Impact:** Eliminates scheduling invoices one by one.

---

## Implementation Roadmap & Execution Order

```
  PHASE 1: HARDEN THE CORE (Days 1–3)
  ├── 1.1 DB-Backed Idempotency Storage
  ├── 1.2 Approval Policy & Threshold Rules
  └── 1.3 Audit-as-a-Tab Component & API

  PHASE 2: OPERATOR ACCELERATION (Days 4–6)
  ├── 4.1 Keyboard Shortcuts (J/K/A/R)
  ├── 4.2 CSV/Bank Payment Export
  ├── 4.4 Quick-Filter Horizon Chips
  └── 4.5 Bulk Payment Scheduling

  PHASE 3: PIPELINE AUTOMATION (Days 7–10)
  ├── 2.2 3-Way Match Tolerance Engine
  ├── 2.3 Payment Batch Execution Runner
  └── 2.4 ERP Sync Adapter & Export Queue

  PHASE 4: INTELLIGENCE & REPORTING (Days 11–15)
  ├── 3.1 Live Document AI OCR Integration
  ├── 3.2 Tax ID / Checksum Verification
  └── 3.3 AP Aging & Cash Forecast Reports
```
