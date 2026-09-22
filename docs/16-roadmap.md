# 16. PRODUCT ROADMAP

**Status:** LOCKED
**Principle:** Build the smallest complete AP product first. Expand only after real usage proves the need.

---

## 16.1 V1 — Complete AP Automation

### Goal

Deliver a complete accounts-payable workflow for SMEs:

```text
Invoice Received
      ↓
Captured
      ↓
Validated
      ↓
Matched
      ↓
Exception Handling
      ↓
Approval
      ↓
Payment
      ↓
ERP Sync
      ↓
Archive
```

### V1 Scope

```text
✓ Invoice intake
✓ Email
✓ Supplier portal
✓ Drag & drop
✓ Scanner
✓ Mobile upload
✓ API
✓ EDI
✓ ERP import

✓ OCR
✓ AI extraction
✓ Barcode detection
✓ QR detection
✓ Multi-page detection
✓ Language detection

✓ Field validation
✓ Vendor validation
✓ GST/VAT validation
✓ Currency validation
✓ Duplicate detection
✓ Date validation
✓ PO validation
✓ Line-item validation
✓ Tax validation
✓ AI confidence

✓ PO matching
✓ Goods receipt matching
✓ Contract matching
✓ Price matching

✓ Exception management
✓ Collaboration
✓ Notes
✓ Comments
✓ Mentions
✓ Attachments
✓ Activity timeline

✓ Sequential approval
✓ Parallel approval
✓ Auto approval
✓ Escalation
✓ Delegation
✓ Reject
✓ Re-submit

✓ Payment scheduling
✓ Payment hold
✓ Partial payment
✓ Batch payment
✓ Early-payment discount
✓ Payment run
✓ Confirmation

✓ ERP synchronization
✓ Journal entry
✓ Vendor balance
✓ Payment status
✓ PO status
✓ Audit log

✓ Archive
✓ Search
✓ Audit
✓ Compliance
✓ Export
✓ Reports
```

---

# 16.2 V1 DEVELOPMENT ORDER

Build in this order.

```text
PHASE 1
Foundation
    ↓
Authentication
Organization
Users
Database
API foundation
Permissions
Audit foundation

PHASE 2
Invoice intake
    ↓
Upload
Document storage
Invoice creation
Inbox

PHASE 3
Invoice intelligence
    ↓
OCR
Extraction
Classification
Validation
Confidence

PHASE 4
Matching
    ↓
Supplier
PO
Goods receipt
Contract
Price

PHASE 5
Exceptions
    ↓
Detection
Queue
Review
Resolution
Collaboration

PHASE 6
Approval
    ↓
Rules
Sequential
Parallel
Escalation
Delegation

PHASE 7
Payments
    ↓
Schedule
Hold
Batch
Partial
Confirmation

PHASE 8
ERP
    ↓
Sync
Journal
Vendor balance
PO status
Payment status

PHASE 9
Reporting + Archive
    ↓
Reports
Search
Audit
Export

PHASE 10
Hardening
    ↓
Security
Performance
Accessibility
Testing
Error handling
Deployment
```

---

# 16.3 V1 SUCCESS CRITERIA

V1 is successful when an SME can:

```text
1. Receive an invoice
2. Extract its information
3. Validate it
4. Match it
5. Resolve exceptions
6. Get approval
7. Schedule payment
8. Sync the result
9. Find the invoice later
10. See the complete audit history
```

without needing a separate spreadsheet or manual tracking system for the normal workflow.

---

# 16.4 V1.1 — OPTIMIZATION

Only after V1 has real usage.

Focus:

```text
Workflow speed
AI accuracy
Exception reduction
Search quality
Approval speed
Payment reliability
ERP reliability
```

Measure before changing.

Do not add large new feature areas.

---

# 16.5 V1.2 — INTELLIGENCE IMPROVEMENT

Improve existing intelligence:

```text
Better extraction
Better duplicate detection
Better supplier matching
Better PO matching
Better exception classification
Better recommendations
Better confidence scoring
```

The goal is:

```text
More invoices processed automatically
↓
Fewer human reviews
↓
Faster AP cycle
```

---

# 16.6 V1.3 — SME SCALE

Improve the existing product for larger invoice volumes.

Focus:

```text
Performance
Bulk operations
Large document sets
Large supplier lists
Large invoice tables
Background processing
Reliability
```

Do not introduce enterprise complexity merely because volume increases.

---

# 16.7 FUTURE — ONLY IF DEMAND EXISTS

Potential future expansion areas:

```text
Advanced supplier collaboration
More ERP integrations
More payment providers
Advanced analytics
Cross-company workflows
Advanced compliance
Advanced fraud detection
```

These are **not V1 commitments**.

They should only be built when:

```text
Real customer demand
+
Clear business value
+
Evidence that the current architecture cannot handle it
```

exists.

---

# 16.8 ROADMAP RULE

Never use the roadmap as a feature wishlist.

Each future item must answer:

```text
Who needs it?
How often?
What problem does it solve?
What measurable value does it create?
Why can't V1 already solve the problem?
```

If the answer is weak:

```text
Do not build it.
```

---

# 17. APPENDICES

---

# APPENDIX A — COMPLETE BUSINESS WORKFLOW

```text
ACCOUNT PAYABLE
│
├── 1. RECEIVE INVOICE
│   ├── Email
│   ├── Supplier Portal
│   ├── Drag & Drop
│   ├── Scanner
│   ├── Mobile Upload
│   ├── API
│   ├── EDI
│   └── ERP Import
│
├── 2. CAPTURE
│   ├── OCR
│   ├── AI Extraction
│   ├── Barcode Detection
│   ├── QR Detection
│   ├── Multi-page Detection
│   └── Language Detection
│
├── 3. VALIDATE
│   ├── Required Fields
│   ├── Vendor Exists
│   ├── GST/VAT
│   ├── Currency
│   ├── Duplicate Invoice
│   ├── Duplicate Amount
│   ├── Invoice Date
│   ├── Due Date
│   ├── PO
│   ├── Line Items
│   ├── Tax
│   └── AI Confidence
│
├── 4. MATCH
│   ├── PO Match
│   ├── Goods Receipt Match
│   ├── Contract Match
│   └── Price Match
│
├── 5. EXCEPTION
│   ├── Missing PO
│   ├── Amount Changed
│   ├── Tax Difference
│   ├── Unknown Vendor
│   ├── Currency Mismatch
│   ├── Duplicate
│   ├── Fraud Risk
│   ├── Missing Signature
│   ├── Invalid GST
│   └── Manual Review
│
├── 6. COLLABORATION
│   ├── Internal Notes
│   ├── Vendor Comments
│   ├── Mentions
│   ├── Attachments
│   └── Activity Timeline
│
├── 7. APPROVAL
│   ├── Auto Approval
│   ├── Sequential
│   ├── Parallel
│   ├── Escalation
│   ├── Delegate
│   ├── Reject
│   └── Re-submit
│
├── 8. PAYMENT
│   ├── Schedule
│   ├── Hold
│   ├── Partial Payment
│   ├── Batch Payment
│   ├── Early Discount
│   ├── Payment Run
│   └── Confirmation
│
├── 9. ERP SYNC
│   ├── Journal Entry
│   ├── Vendor Balance
│   ├── Payment Status
│   ├── PO Status
│   └── Audit Log
│
└── 10. ARCHIVE
    ├── Search
    ├── Audit
    ├── Compliance
    ├── Export
    └── Reports
```

---

# APPENDIX B — CORE INVOICE STATE MACHINE

```text
RECEIVED
   │
   ▼
PROCESSING
   │
   ▼
VALIDATED
   │
   ├───────────────┐
   │               │
   ▼               ▼
MATCHED         EXCEPTION
   │               │
   │               ▼
   │           UNDER REVIEW
   │               │
   │               ▼
   │           RESOLVED
   │               │
   └───────┬───────┘
           ▼
      PENDING APPROVAL
           │
     ┌─────┴─────┐
     ▼           ▼
  APPROVED     REJECTED
     │
     ▼
READY FOR PAYMENT
     │
     ▼
SCHEDULED
     │
     ▼
PAYMENT PROCESSING
     │
     ▼
PAID
     │
     ▼
ERP SYNCED
     │
     ▼
ARCHIVED
```

---

# APPENDIX C — EXCEPTION STATE

```text
DETECTED
   ↓
OPEN
   ↓
ASSIGNED
   ↓
UNDER REVIEW
   │
   ├── Need information
   │        ↓
   │      WAITING
   │        ↓
   │      REVIEW
   │
   ├── Resolved
   │        ↓
   │     RESOLVED
   │
   └── Rejected
            ↓
         REJECTED
```

---

# APPENDIX D — APPROVAL STATE

```text
PENDING
   │
   ├── Approve
   │      ↓
   │   APPROVED
   │
   ├── Reject
   │      ↓
   │   REJECTED
   │
   └── Request Information
          ↓
       WAITING
          ↓
       PENDING
```

For sequential approval:

```text
Approver 1
   ↓
Approver 2
   ↓
Approver 3
   ↓
APPROVED
```

For parallel approval:

```text
        ┌── Approver 1 ──┐
        │                │
Invoice ├── Approver 2 ──┼──→ APPROVED
        │                │
        └── Approver 3 ──┘
```

---

# APPENDIX E — PAYMENT STATE

```text
READY
  ↓
SCHEDULED
  ↓
PAYMENT RUN
  ↓
PROCESSING
  │
  ├── Success → PAID
  │
  └── Failure → PAYMENT FAILED
                    │
                    ▼
                 REVIEW
```

---

# APPENDIX F — USER ROLES

Core roles (Canonical 5-role model per Doc 18 & AGENTS.md):

```text
ADMINISTRATOR
FINANCE MANAGER
FINANCE EXECUTIVE
APPROVER
READ ONLY
```

Responsibilities:

```text
ADMINISTRATOR
├── Users & Role Management
├── Tenant Permissions
├── System Settings
├── ERP Integrations
└── Tier 3 (> ₹5,00,000) Approval Authority

FINANCE MANAGER
├── Full operational workflow access
├── Payment batch runner & execution
├── Tier 2 (₹1,00,000 – ₹5,00,000) Approvals
├── Financial liquidity oversight & DPO reports
└── ERP sync clearance

FINANCE EXECUTIVE (Operational AP Specialist)
├── Invoice ingestion & capture verification
├── Line item & 3-way match exception resolution
├── Supplier master maintenance & tax validation
├── Non-disbursement workflow actions
└── (No approval authority)

APPROVER
├── Invoice review & document verification
├── Line item verification
├── Tier 1 (≤ ₹1,00,000) Approve / Reject actions
└── Request information & comment logging

READ ONLY (Auditor / Executive Leadership / CFO)
├── Immutable historical audit trail inspection
├── Financial report & aging bucket visibility
└── Read-only register inspection across all stages
```

Permissions must be enforced server-side.

---

# APPENDIX G — PRIMARY SCREENS

```text
01  Overview
02  Inbox
03  Invoices
04  Invoice Detail / Review
05  Exceptions
06  Exception Detail
07  Approvals
08  Approval Detail
09  Payments
10  Payment Detail
11  Suppliers
12  Supplier Detail
13  Purchase Orders
14  Reports
15  Archive
16  Settings
```

---

# APPENDIX H — CORE REUSABLE COMPONENTS

```text
Layout
Sidebar
TopBar
Breadcrumb
PageHeader
StatusBadge
ConfidenceBadge
Amount
Date
DataTable
Search
FilterBar
Pagination
ActionMenu
Modal
Drawer
ConfirmDialog
Toast
EmptyState
ErrorState
LoadingState
DocumentViewer
InvoiceSummary
InvoiceFields
ExceptionCard
ApprovalTimeline
ActivityTimeline
CommentBox
AttachmentList
PaymentSummary
AuditLog
```

---

# APPENDIX I — AI PRINCIPLES

```text
AI assists.
Rules govern.
Humans control.
Audit records.
```

AI may:

```text
Extract
Classify
Match
Detect
Recommend
Explain
```

AI may not independently:

```text
Approve payment
Execute payment
Override permissions
Delete financial records
Change authoritative financial state
```

---

# APPENDIX J — TRUST MODEL

The system should establish trust through:

```text
Evidence
+
Rules
+
Transparency
+
Human control
+
Auditability
```

For every important automated decision:

```text
WHAT happened?
WHY?
WHAT evidence supports it?
WHAT can I do?
```

---

# APPENDIX K — SME VALUE MODEL

The product's value proposition is:

```text
Traditional AP

Invoice
  ↓
Manual entry
  ↓
Manual validation
  ↓
Manual matching
  ↓
Email
  ↓
Spreadsheet
  ↓
Approval
  ↓
Payment
  ↓
ERP
```

versus:

```text
AP SaaS

Invoice
  ↓
AI processing
  ↓
Automatic validation
  ↓
Automatic matching
  ↓
Exception only
  ↓
Approval
  ↓
Payment
  ↓
ERP
```

The product should move human effort from:

```text
PROCESSING
```

to:

```text
DECISION MAKING
```

---

# APPENDIX L — PRODUCT POSITIONING

The product is positioned as:

```text
AI-powered accounts payable automation
for SMEs.
```

Core message:

```text
Process invoices automatically.
Handle only exceptions.
Approve faster.
Pay with confidence.
Keep the audit trail.
```

The product should not position itself as an unnecessarily complex enterprise finance platform.

---

# APPENDIX M — FINAL ARCHITECTURE

```text
                    ┌──────────────────────┐
                    │       WEB APP        │
                    │ React + TypeScript   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │         API          │
                    │ Node + TypeScript    │
                    └──────────┬───────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
      ┌───────────┐      ┌───────────┐     ┌───────────┐
      │ Business  │      │ Workflow  │     │    AI     │
      │ Modules   │      │  Engine   │     │ Services  │
      └─────┬─────┘      └─────┬─────┘     └─────┬─────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               ▼
                    ┌──────────────────────┐
                    │      PostgreSQL      │
                    └──────────────────────┘
                               │
                    ┌──────────┴───────────┐
                    ▼                      ▼
             Object Storage          Background Jobs
                    │                      │
                    └──────────┬───────────┘
                               ▼
                         ERP / Payment
                         Integrations
```

---

# APPENDIX N — FINAL BUILD RULE

Before adding anything to the product:

```text
                    NEW IDEA
                       │
                       ▼
              Does V1 require it?
                 /           \
               NO             YES
               │               │
               ▼               ▼
             DON'T       Does existing code
              BUILD        handle it?
                           /        \
                         YES         NO
                          │           │
                          ▼           ▼
                        REUSE     Simplest
                                  solution
                                      │
                                      ▼
                                    BUILD
```

---

# APPENDIX O — FINAL PRODUCT TEST

The finished application should pass this test:

```text
Can an SME upload an invoice
        ↓
and understand what happened
        ↓
without training?
        ↓
Can the system process normal invoices
without human intervention?
        ↓
Does the user see only exceptions?
        ↓
Can an approver make a decision quickly?
        ↓
Can finance safely execute payment?
        ↓
Can anyone later prove what happened?
```

If the answer is **yes**, the product is doing its job.

If the answer is **no**, simplify or fix the existing workflow before adding another feature.

---

# FINAL LOCK

```text
PRODUCT
    ↓
Simple AP automation

UX
    ↓
Calm, clear, focused

AI
    ↓
Assist, explain, recommend

WORKFLOW
    ↓
Rules and state control

HUMAN
    ↓
Handle exceptions and decisions

ENGINEERING
    ↓
Simple, modular, maintainable

SCOPE
    ↓
YAGNI

PRIORITY
    ↓
Business value over technical complexity
```

**This document is the final V1 product blueprint.**
