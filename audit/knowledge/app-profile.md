# Avarta AP Workspace — Application Profile

## 1. Application Overview
- **Product Name**: Avarta AP Workspace
- **Category**: Accounts Payable (AP) Automation & Financial Workflow SaaS for SMEs (10–500 employees).
- **Core Mission**: Complements existing accounting/ERP systems (QuickBooks, Xero, Tally, SAP, Oracle) by streamlining the AP workflow without replacing the general ledger.
- **Workflow Architecture**: Strictly linear workflow:
  `Receive → Capture → Validate → Match → Exception → Approval → Payment → ERP Sync → Archive`
  Exceptions branch temporarily and always rejoin the main flow.
- **Core Philosophy**: "AI suggests, humans decide" (no automatic field advance without explicit human click). "Nothing is ever deleted" (soft-archival / revocation).

## 2. Personas & Roles
1. **Administrator** (`admin@avarta.dev`):
   - Governance, tenant setup, role permissions, ERP connections, audit log inspection.
2. **Finance Manager** (`manager@avarta.dev`):
   - Full operational command (Mission Control Overview, payment scheduling, batch release, financial metrics).
3. **Finance Executive** (`executive@avarta.dev`):
   - Ingest, document capture, OCR validation, 3-way matching workbench, initial exception triage.
4. **Approver** (`approver@avarta.dev`):
   - Threshold-based invoice sign-off, approval queue, line item verification, rejection with audit note.
5. **Read Only**:
   - Auditor and compliance view, read-only analytics and reports.

## 3. Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, React Router v6. Design tokens in `src/design-system/tokens.ts`.
- **Backend**: Express + TypeScript + Prisma ORM + PostgreSQL. Layered architecture: `controller → service → repository → database`.
- **Engine**: Dedicated Workflow Engine (`apps/api/src/workflow/`) and deterministic state machine.
- **Serving / Preview**: Vite preview on port `3000`, Express API on port `3001`.

## 4. Key Routes & Flow Architecture
### Public & Utility
- `/login`: Clean enterprise credential authentication.
- `/forgot-password`, `/reset-password`: Self-service recovery flow.
- `/privacy`, `/terms`, `/dpa`, `/subprocessors`, `/refund`: Legal, GDPR, and security policy pages.
- `/track/:token`: External vendor portal for self-service invoice tracking.

### Core AP Workspace (Protected)
- `/overview`: Mission Control — Financial Horizon KPI strip, Actionable Work Queue, Linear Pipeline Funnel.
- `/inbox`: Multi-channel document intake (Upload, Drag-and-drop, Email simulation, OCR trigger).
- `/invoices`: Invoices registry, faceted filtering (status, supplier, amount, date range), search, bulk schedule.
- `/invoices/:invoiceId`: 3-way matching workbench (PO vs GRN vs Invoice), line item table, document split preview, audit timeline.
- `/exceptions`: 14 canonical exception types resolution workbench.
- `/approvals`: Role-based approval queue, SLA tracking, one-click release/ping.
- `/payments`: Payment batching, scheduling, status tracking (AWAITING_SCHEDULE, SCHEDULED, PROCESSING, PAID).
- `/suppliers`: Supplier directory, bank verification, payment terms, contact info.
- `/purchase-orders`: Purchase order registry, commitment tracking, line items.
- `/reports`: AP aging analysis, cash requirements, DPO, vendor exposure.
- `/archive`: Historical records, immutable audit snapshots.
- `/settings`: Company profile, users, approval matrices, integrations, audit logs.
- `/notifications`: Real-time system notifications and alerts.
- `/profile`: User credentials, MFA, theme settings.

## 5. Critical Risk Areas & App-Specific Domains
1. **Financial Operations & Calculations**: Tabular precision, no silent rounding, correct tax and currency arithmetic.
2. **Tenant Isolation**: Mandatory `organization_id` session verification; no IDOR.
3. **Workflow Integrity**: State transitions driven solely by the Workflow Engine.
4. **OCR & Confidence Boundaries**: High (≥95%), Medium (80–94%), Low (<80%). No auto-commit.
5. **Data Density & Viewport Scaling**: Monospace tabular currency across varied viewports (320px–1920px).
