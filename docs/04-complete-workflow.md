# 04. Complete Accounts Payable Workflow

**Version:** 1.0 (Locked)

---

# Objective

Define the complete Accounts Payable workflow from invoice receipt to archive.

This workflow is the foundation of the application.

Every feature, page and component must belong to one stage of this workflow.

---

# Business Workflow

```text
Receive Invoice
        │
        ▼
Capture
        │
        ▼
Validate
        │
        ▼
Match
        │
        ▼
Exception? ─────────────── Yes ─────► Resolve Exception
        │                               │
        │ No                            │
        ▼                               │
Approval ◄──────────────────────────────┘
        │
        ▼
Payment
        │
        ▼
ERP Sync
        │
        ▼
Archive
```

The workflow is linear.

Exceptions temporarily leave the workflow.

Once resolved, they return to the workflow.

The workflow never forks permanently.

---

# Workflow Stages

```text
1. Receive Invoice
2. Capture
3. Validate
4. Match
5. Exception Handling
6. Approval
7. Payment
8. ERP Sync
9. Archive
```

---

# Stage 1 — Receive Invoice

## Objective

Collect invoices from every supported source.

---

## Input Sources

```text
Receive Invoice

├── Email
├── Supplier Portal
├── Drag & Drop
├── Scanner
├── Mobile Upload
├── API
├── EDI
└── ERP Import
```

---

## Input

Invoice document

Supported formats

- PDF
- Image
- XML
- Electronic Invoice
- ZIP (multiple invoices)

---

## Output

Invoice enters processing queue.

Status

```text
Received
```

---

## User Actions

- Upload
- Drag files
- Forward email
- Import
- View upload progress

---

## System Actions

- Accept file
- Generate Invoice ID
- Store original document
- Create audit event
- Queue for processing

---

# Stage 2 — Capture

## Objective

Extract structured data from the invoice.

---

## Workflow

```text
Invoice

↓

OCR

↓

AI Extraction

↓

Normalization

↓

Structured Data
```

---

## AI Extracts

Vendor

Invoice Number

Invoice Date

Due Date

Currency

Subtotal

Tax

Total

Purchase Order

Payment Terms

Reference Numbers

Line Items

---

## System Actions

- OCR
- AI extraction
- Field normalization
- Confidence scoring
- Language detection

---

## Output

Structured invoice.

Status

```text
Captured
```

---

# Stage 3 — Validate

## Objective

Verify invoice accuracy.

---

## Validation Rules

```text
Validate

├── Required Fields
├── Vendor Exists
├── Invoice Number
├── Duplicate Invoice
├── Duplicate Amount
├── Invoice Date
├── Due Date
├── Currency
├── Tax Validation
├── GST/VAT Validation
├── Purchase Order
├── Line Items
└── AI Confidence
```

---

## Validation Results

```text
Passed

or

Failed
```

---

## If Passed

Continue.

---

## If Failed

Move to Exception Handling.

---

## System Actions

- Execute validation rules
- Compare historical invoices
- Detect duplicates
- Verify vendor
- Calculate confidence

---

## Output

```text
Validated
```

or

```text
Exception
```

---

# Stage 4 — Match

## Objective

Verify invoice against business documents.

---

## Matching Types

```text
Match

├── Purchase Order
├── Goods Receipt
├── Contract
└── Price
```

---

## Match Result

```text
Matched

or

Mismatch
```

---

## Mismatch

Move to Exception Handling.

---

## Output

```text
Matched
```

---

# Stage 5 — Exception Handling

## Objective

Resolve issues before approval.

---

## Exception Types

```text
Exceptions

├── Missing PO
├── Unknown Vendor
├── Duplicate Invoice
├── Duplicate Amount
├── Tax Difference
├── Currency Difference
├── Price Difference
├── Quantity Difference
├── Missing Signature
├── Invalid GST
├── Low AI Confidence
├── Missing Required Field
└── Manual Review
```

---

## User Actions

- Edit values
- Upload replacement invoice
- Request information
- Assign owner
- Add comments
- Retry validation

---

## Resolution

```text
Resolved

↓

Validate

↓

Continue Workflow
```

---

## Output

```text
Resolved
```

---

# Stage 6 — Approval

## Objective

Approve invoice before payment.

---

## Approval Types

```text
Approval

├── Auto Approval
├── Sequential
├── Parallel
├── Manual
└── Delegated
```

---

## Approval Actions

- Approve
- Reject
- Return
- Delegate
- Comment

---

## Approval Result

```text
Approved

or

Rejected
```

---

## Rejected

Return to Exception Handling.

---

## Output

```text
Approved
```

---

# Stage 7 — Payment

## Objective

Schedule and complete payment.

---

## Payment Actions

```text
Payment

├── Schedule
├── Hold
├── Partial Payment
├── Batch Payment
├── Early Payment
└── Confirm
```

---

## Payment Status

```text
Scheduled

↓

Processing

↓

Paid
```

---

## Output

```text
Paid
```

---

# Stage 8 — ERP Sync

## Objective

Update connected accounting software.

---

## Sync Data

```text
ERP Sync

├── Invoice
├── Vendor
├── Payment
├── Journal Entry
├── Purchase Order
└── Audit
```

---

## Integrations

- QuickBooks
- Xero
- Zoho Books
- Tally
- SAP
- Oracle

---

## Output

```text
Synced
```

---

# Stage 9 — Archive

## Objective

Store completed records.

---

## Archive Includes

Invoice

Attachments

Comments

Approval History

Payment History

Audit Trail

---

## User Actions

- Search
- Export
- Download
- View history

---

## Output

```text
Archived
```

---

# Complete Business Workflow Tree

```text
Accounts Payable

├── Receive Invoice
│   ├── Email
│   ├── Supplier Portal
│   ├── Drag & Drop
│   ├── Scanner
│   ├── Mobile Upload
│   ├── API
│   ├── EDI
│   └── ERP Import
│
├── Capture
│   ├── OCR
│   ├── AI Extraction
│   ├── Normalization
│   ├── Language Detection
│   └── Confidence Score
│
├── Validate
│   ├── Required Fields
│   ├── Vendor Exists
│   ├── Invoice Number
│   ├── Duplicate Check
│   ├── Currency
│   ├── Tax Validation
│   ├── GST/VAT
│   ├── Purchase Order
│   ├── Line Items
│   └── AI Confidence
│
├── Match
│   ├── Purchase Order
│   ├── Goods Receipt
│   ├── Contract
│   └── Price
│
├── Exception Handling
│   ├── Review
│   ├── Edit
│   ├── Request Information
│   ├── Assign
│   ├── Comment
│   └── Retry Validation
│
├── Approval
│   ├── Auto
│   ├── Sequential
│   ├── Parallel
│   ├── Delegate
│   ├── Reject
│   └── Approve
│
├── Payment
│   ├── Schedule
│   ├── Hold
│   ├── Partial
│   ├── Batch
│   ├── Early Payment
│   └── Confirmation
│
├── ERP Sync
│   ├── Invoice
│   ├── Vendor
│   ├── Journal
│   ├── Payment
│   └── Audit
│
└── Archive
    ├── Documents
    ├── Audit
    ├── Search
    ├── Export
    └── Reports
```

---

# System Workflow

The system pipeline is independent of the UI.

```text
Invoice Received
        │
        ▼
Upload Queue
        │
        ▼
File Validation
        │
        ▼
Virus Scan
        │
        ▼
Document Storage
        │
        ▼
OCR
        │
        ▼
AI Extraction
        │
        ▼
Normalization
        │
        ▼
Validation Engine
        │
        ▼
Matching Engine
        │
        ▼
Business Rules Engine
        │
        ▼
Exception Engine
        │
        ▼
Approval Engine
        │
        ▼
Payment Engine
        │
        ▼
ERP Connector
        │
        ▼
Notification Service
        │
        ▼
Audit Service
        │
        ▼
Analytics
        │
        ▼
Archive
```

---

# System Services

```text
Input Service
│
├── File Upload
├── Email Import
├── API Import
└── Portal Upload

OCR Service
│
├── OCR
├── AI Extraction
└── Confidence

Validation Service
│
├── Rules
├── Duplicate Check
├── Vendor Check
└── Tax Check

Matching Service
│
├── PO
├── Goods Receipt
├── Contract
└── Price

Workflow Service
│
├── Status
├── Assignment
├── Routing
└── State

Approval Service
│
├── Rules
├── Notifications
└── Decisions

Payment Service
│
├── Schedule
├── Execute
└── Confirm

Integration Service
│
├── ERP
├── Accounting
└── Webhooks

Audit Service
│
├── Activity
├── History
└── Logs
```

---

# Workflow States

Every invoice must exist in exactly one state.

```text
Received

↓

Captured

↓

Validated

↓

Matched

↓

Exception

↓

Approved

↓

Scheduled

↓

Paid

↓

Synced

↓

Archived
```

No invoice can skip a state.

Exceptions return to the previous workflow stage after resolution.

---

# Workflow Rules

- Workflow is linear.
- Every invoice has one current state.
- Every state has one owner.
- Every transition creates an audit event.
- Failed validation always creates an exception.
- Resolved exceptions return to the workflow.
- Approval is required before payment.
- Payment is required before ERP sync.
- ERP sync is required before archive.

---

# Locked Decisions

✓ Single linear workflow

✓ Exceptions are temporary

✓ One invoice = one state

✓ One workflow = one source of truth

✓ Business workflow separated from system workflow

✓ Workflow stages define the entire application structure

✓ No workflow branching except exception handling

✓ Every transition is auditable

✓ Every stage has a single responsibility
