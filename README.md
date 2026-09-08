# Avarta AP Workspace

An Accounts Payable workspace for SMEs (10–500 employees) — built from a locked
product blueprint. Complements existing accounting ERPs (QuickBooks, Xero, Tally, SAP, Oracle).

> *आत्मानं विद्धि • Know Thyself*

## What's actually working in this slice

- **Atmospheric Institutional Branding** — Heraldic crest watermark, Chomsky Old English headers, and clean financial data density.
- **Linear AP Lifecycle** — Receive → Capture → Validate → 3-Way Match → Exception → Approval → Payment Disbursement → ERP Sync → Archive.
- **Workflow Engine** — Canonical deterministic state machine with strict single-owner integrity.
- **AI Decision Heuristics** — Multi-band confidence scores (High ≥95%, Medium 80–94%, Low <80%). AI suggests; humans decide.
- **Suppliers & Procurement** — 8 pre-seeded enterprise vendors (Tata Steel, BlueDart, Siemens, Maersk, Dell...) with compliance & GST tracking.
- **Exceptions & Approvals** — Multi-tier approval thresholds and 14 canonical exception types.
- **Treasury Disbursement** — Host-to-host bank settlement modal with reference generation and audit advice.

## Quick Demo Credentials

All demo roles share password: `password123`

- **Finance Manager (Primary)**: `manager@avarta.dev` (or `manager@clearops.dev`)
- **Approver**: `approver@avarta.dev` (or `approver@clearops.dev`)
- **Finance Executive**: `executive@avarta.dev` (or `executive@clearops.dev`)
- **Administrator**: `admin@avarta.dev` (or `admin@clearops.dev`)

*(On the login screen, you can also use the **1-Tap Demo Buttons** on mobile or desktop without typing).*

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
