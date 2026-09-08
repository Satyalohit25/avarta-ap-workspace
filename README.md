# Avarta AP Workspace

An Accounts Payable workspace for SMEs (10–500 employees) — built from a locked
product blueprint. Complements existing accounting ERPs (QuickBooks, Xero, Tally, SAP, Oracle).

> *आत्मानं विद्धि • Know Thyself*

## 🌐 Live Showcase & Cloud Deployment

- **Live Web Application**: [https://avarta-ap-workspace-web-beryl.vercel.app](https://avarta-ap-workspace-web-beryl.vercel.app/)
- **Backend API (Render)**: [https://avarta-api.onrender.com](https://avarta-api.onrender.com/)
- **Database (Neon Serverless PostgreSQL)**: Connected & pre-seeded with 8 enterprise vendors, POs, and invoices.

## Quick Demo Credentials

All demo roles share password: `password123`

- **Finance Manager (Primary)**: `manager@avarta.dev`
- **Approver**: `approver@avarta.dev`
- **Finance Executive (Invoice Clerk)**: `executive@avarta.dev`
- **Administrator**: `admin@avarta.dev`

*(On the login screen, you can also use the **⚡ 1-Tap Demo Buttons** on mobile or desktop without typing).*

## 🧭 Interactive Onboarding & Product Tour

Avarta includes a built-in **"Tour Guide" (`?`)** in the top navigation bar designed for zero-learning-curve onboarding. Clicking it launches an interactive walkthrough covering:
1. **60-Second Linear AP Lifecycle**: Interactive 7-stage stepper from Ingest to 8-Year Archive.
2. **Team Roles & Permissions**: Complete breakdown of what each persona can do.
3. **AI Governance**: Visual guide to confidence bands (High/Medium/Low) and the rule *"AI suggests, humans decide"*.
4. **Quick Navigation Directory**: 1-click jumps to any operational workstation.

## 📋 Master Capabilities Directory (Supported & Present)

### 1. Invoice Intake, OCR & Verification
- **Batch Digital Ingest (`/inbox`)** — Drag-and-drop intake for multi-page PDF/scanned invoices.
- **Side-by-Side Verification** — Split-screen workspace displaying the original document directly alongside extracted line items.
- **AI Confidence Bands** — Visual trust tiers (High ≥95%, Medium 80–94%, Low <80%) with 1-click pre-fill acceptance.
- **"AI Suggests, Humans Decide" Rule** — AI never writes values or advances workflow states without an explicit human click.
- **Non-PO Invoice Entry** — Dedicated intake form for service and utility bills that do not require an upstream PO.

### 2. Purchase Orders & 3-Way Matching
- **Purchase Order Creation (`/purchase-orders`)** — Complete PO creation with cost center tags, delivery locations, commercial tolerances, and multi-line items.
- **Automated 3-Way Line Matching** — Compares invoice line items against PO quantities and unit prices with real-time variance badges.
- **Committed Spend Tracking** — Live tracking of committed PO budgets vs. invoiced amounts vs. remaining balance.
- **GRNI / Unbilled Support** — Identifies goods received and open commitments that have not yet been billed by suppliers.

### 3. Discrepancy & Exception Engine
- **14 Canonical Exception Resolvers (`/exceptions`)** — Automated routing for: `PRICE_DIFFERENCE`, `QUANTITY_DIFFERENCE`, `MISSING_PO`, `UNKNOWN_VENDOR`, `DUPLICATE_INVOICE`, `DUPLICATE_AMOUNT`, `TAX_DIFFERENCE`, `CURRENCY_MISMATCH`, `MISSING_SIGNATURE`, `INVALID_GST`, `LOW_AI_CONFIDENCE`, `MISSING_REQUIRED_FIELD`, `FRAUD_RISK`, and `MANUAL_REVIEW`.
- **Temporary Branching Workflow** — Discrepancies branch into isolated resolution queues without blocking the rest of the clean pipeline.
- **Blocked Invoice Governance** — Visual blocked badges that require documented resolution before invoices can proceed to payment.

### 4. Approval Hierarchy & Governance
- **Multi-Tier Approval Hub (`/approvals`)** — Role-based approval routing based on dollar/currency thresholds and department responsibility.
- **Line-Item Sign-Off** — Approvers review complete invoice breakdowns with PO comparison before authorizing disbursement.
- **Mandatory Rejection Audits** — Approvers must log documented rejection reasons so purchasers and suppliers receive clear explanations.
- **Single-Owner Workflow Engine** — Only the deterministic workflow engine can change state; prevents race conditions and duplicate approvals.

### 5. Treasury, Payments & Wire Disbursements
- **Payment Pipeline Tracking (`/payments`)** — Real-time ledger tracking payables across `AWAITING_SCHEDULE`, `SCHEDULED`, `PROCESSING`, and `PAID`.
- **Disbursement Modal & Receipts** — Host-to-Host (H2H) settlement advice generator creating unique payment references (`H2H-DISB-XXXXXXXX`).
- **Multi-Currency Settlement** — Native handling of global currencies: **INR (₹), USD ($), EUR (€), GBP (£), and CAD ($)**.
- **Payment Batch Scheduling** — Batch scheduling of due payables to optimize working capital and capture early-payment discounts.

### 6. Vendor Management & Stakeholder Portal
- **Vendor Master Directory (`/suppliers`)** — Comprehensive profiles storing legal names, tax/GSTIN registrations, bank wire instructions, payment terms, and balances.
- **Self-Serve Vendor Tracker (`/track/:invoiceId`)** — Dedicated public portal allowing suppliers to check real-time payment status self-serve, eliminating query emails.
- **Vendor Compliance Status** — Instant status flags (`ACTIVE`, `BLOCKED`, `PENDING_COMPLIANCE`) preventing payments to unverified suppliers.
- **Internal Comment Drawer** — Contextual chat and note threads attached directly to invoices for finance and procurement collaboration.

### 7. ERP Sync & Month-End Closing
- **ERP Integration Gateway (`ErpSyncModal.tsx`)** — Ready export modals for **Tally, SAP, QuickBooks, Xero, and NetSuite**.
- **Sync-Locking Safeguards** — Prevents duplicate postings to accounting general ledgers with idempotency locks.
- **Matrix GL Coding** — Prepares line-item allocations (GL Account, Department, Cost Center) for clean month-end ledger consolidation.

### 8. Audit Trails, Controls & Compliance
- **Immutable Audit Log** — Every user click, status change, timestamp, and IP address is permanently logged in a tamper-proof audit trail.
- **8-Year Statutory Legal Archive (`/archive`)** — Compliant digital record repository for long-term audit inspections.
- **Role-Based Access Control (RBAC)** — Strict separation of duties across 5 canonical roles: `Administrator`, `Finance Manager`, `Finance Executive`, `Approver`, and `Read Only`.
- **Zero Entity Deletion** — Entities are archived, deactivated, or revoked, never permanently deleted.

### 9. Intelligence, Metrics & CFO Analytics
- **Operational Overview (`/overview`)** — Live dashboard showing processing velocity, open bottlenecks, and stage counts with zero clutter.
- **Financial Horizon Strip** — Real-time metrics showing Days Payable Outstanding (DPO), total cash outflow due in 7/14/30 days, and discount capture.
- **CFO ROI Simulator (`/reports`)** — Interactive calculator demonstrating AP team hours saved, early discount capture, and cost-per-invoice reduction.

### 10. Multi-Device Experience & Live Showcase
- **⚡ 1-Tap Quick Demo Sign-In** — Touch pill buttons on the login screen (`Finance Manager`, `Approver`, `Executive`, `Admin`) for instant sign-in with zero typing.
- **Responsive Multi-Device Layout** — Auto-collapsing icon rail on tablets/iPads, slide-out drawer on mobile phones, and data-dense dual-pane on laptops.
- **Heraldic Institutional Branding** — Avarta heraldic crest watermark, Chomsky typography, and high-contrast tabular figures for rapid financial scanning.

## Running Locally

**Prerequisites:** Node.js 20+, pnpm, Docker (for local Postgres) or Neon Cloud PostgreSQL.

```bash
# 1. Start local Postgres (optional if using cloud database)
docker compose up -d

# 2. Database Migration & Seed
pnpm db:setup

# 3. Start development servers
pnpm dev:api   # API: http://localhost:4000
pnpm dev:web   # Web: http://localhost:5173
```

Seeded invoices start in `Received` status. Open one and click **Run
Capture, Validation & Matching** to push it through the pipeline — it'll
either reach `Waiting Approval` or land in `Exception` depending on the
mock validation rules in `apps/api/src/modules/invoices/service.ts`.

## A note on this sandbox vs. your machine

This project was scaffolded and verified (dependencies installed,
`tsc --noEmit` clean, frontend production build clean) in a sandboxed
environment without general internet access. One step could not be
verified here: `npx prisma generate` needs to download engine binaries
from `binaries.prisma.sh`, which this sandbox's network doesn't allow.
That will work normally on your machine or inside Antigravity, which has
full internet access — just run `npm run db:generate` as the setup steps
above show. Everything else (the schema itself, every route, the
workflow engine, the entire frontend) was actually installed, compiled,
and built successfully, not just written and assumed correct.

## Continuing in Antigravity

Open this folder as the workspace root. Point Antigravity's agents at
`AGENTS.md` — it's written specifically as agent-readable context,
condensing every locked product decision (roles, navigation, state
machine, exception types, AI confidence rules, design tokens) so agents
don't have to rediscover or accidentally contradict them. The full
detail behind every rule in `AGENTS.md` is in `docs/`, referenced by
document number, if an agent needs to go deeper than the summary.

Suggested next tasks, in the order `docs/16-roadmap.md` recommends:

1. Purchase Orders module (schema already exists — build the API + page)
2. Real OCR/AI provider behind `apps/api/src/ai/` (currently mocked
   inline in `invoices/service.ts` — extract it into its own module first)
3. Settings (Doc 06.12) — organization, users, approval rules
4. Reports (Doc 06.11) — the only place charts are allowed
5. Background job queue to replace the synchronous `processInvoice` call
   with the real async pipeline Doc 09/12 describe

## Repo layout

```
apps/api     Express + TypeScript + Prisma + PostgreSQL
apps/web     React + TypeScript + Vite + Tailwind
docs/        The locked product blueprint (design system + reconciliation
             docs included in full; others referenced by number — ask for
             any of them in full if an agent needs the complete text)
AGENTS.md    Start here
```
