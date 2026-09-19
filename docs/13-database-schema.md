Below is the **locked V1 database schema**. I’ve kept it deliberately lean: enough to support the complete AP workflow, AI, approvals, payments, audit, reporting, and integrations without turning it into an over-engineered ERP database.

```markdown id="61482"
# 13. Database Schema Specification

**Version:** 1.0 (Locked)

---

# Objective

The database is the persistent source of truth for the AP SaaS.

It stores:

- Organization data
- Users and permissions
- Suppliers
- Purchase Orders
- Invoices
- Invoice line items
- Documents
- Validation results
- Matching results
- Exceptions
- Approvals
- Payments
- Workflow state
- Notifications
- Audit history
- AI results
- Integrations
- System configuration

---

# Database Principles

- Relational database.
- Organization isolation on every business entity.
- One source of truth for each entity.
- Foreign keys for relationships.
- Monetary values use fixed precision.
- Status values are controlled.
- Audit records are immutable.
- Documents are stored outside the database.
- Database stores document metadata and storage references.
- No unnecessary duplication.
- No event-sourcing in V1.
- No separate database per module.
- No microservice databases.

---

# Recommended Database

PostgreSQL.

Reason:

- Strong relational model.
- Reliable transactions.
- JSON support where genuinely useful.
- Good indexing.
- Good reporting capability.
- Strong constraint support.

---

# ENTITY RELATIONSHIP

```text
Organization
│
├── Users
│   └── User Roles
│
├── Suppliers
│   ├── Supplier Contacts
│   └── Supplier Bank Accounts
│
├── Purchase Orders
│   ├── PO Lines
│   └── Goods Receipts
│
├── Invoices
│   ├── Documents
│   ├── Invoice Lines
│   ├── Validations
│   ├── Matches
│   ├── Exceptions
│   ├── Approvals
│   ├── Payments
│   ├── AI Results
│   └── Workflow
│
├── Notifications
│
├── Audit Logs
│
├── Integrations
│
└── Settings
```

---

# 1. organizations

Stores the customer organization.

```text
organizations
────────────────────────────────────────────
id                  UUID PK
name                VARCHAR(200)
legal_name          VARCHAR(200)
country             VARCHAR(2)
default_currency    CHAR(3)
timezone            VARCHAR(100)
fiscal_year_start   SMALLINT
date_format         VARCHAR(30)
language            VARCHAR(10)
logo_url            TEXT
status              VARCHAR(20)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

# 2. users

Stores application users.

```text
users
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK
email               VARCHAR(320)
password_hash       TEXT
full_name           VARCHAR(200)
phone               VARCHAR(50)
job_title           VARCHAR(150)
department          VARCHAR(150)
timezone             VARCHAR(100)
language            VARCHAR(10)
avatar_url           TEXT
status               VARCHAR(20)
mfa_enabled          BOOLEAN
last_login_at        TIMESTAMP
created_at           TIMESTAMP
updated_at           TIMESTAMP
```

Unique:

```text
organization_id + email
```

---

# 3. roles

```text
roles
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK NULL
name                VARCHAR(100)
description         TEXT
is_system_role      BOOLEAN
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

System roles:

```text
Administrator
Finance Manager
Finance Executive
Approver
Read Only
```

---

# 4. user_roles

```text
user_roles
────────────────────────────────────────────
user_id             UUID FK
role_id             UUID FK
created_at          TIMESTAMP

PRIMARY KEY
(user_id, role_id)
```

---

# 5. permissions

```text
permissions
────────────────────────────────────────────
id                  UUID PK
code                VARCHAR(100)
description         TEXT
```

Examples:

```text
invoice.read
invoice.create
invoice.edit
invoice.approve

payment.read
payment.schedule
payment.execute

supplier.read
supplier.edit

report.read

settings.manage
```

---

# 6. role_permissions

```text
role_permissions
────────────────────────────────────────────
role_id             UUID FK
permission_id       UUID FK

PRIMARY KEY
(role_id, permission_id)
```

---

# 7. suppliers

Supplier master record.

```text
suppliers
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK

supplier_code       VARCHAR(100)
legal_name          VARCHAR(250)
display_name        VARCHAR(250)

tax_id              VARCHAR(100)
gst_number          VARCHAR(100)

country             VARCHAR(2)
currency            CHAR(3)

payment_method      VARCHAR(50)
payment_terms_days  INTEGER

status              VARCHAR(20)

email               VARCHAR(320)
phone               VARCHAR(50)
address_line_1      TEXT
address_line_2      TEXT
city                VARCHAR(100)
state               VARCHAR(100)
postal_code         VARCHAR(30)

outstanding_balance NUMERIC(18,2)

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Supplier status:

```text
ACTIVE
INACTIVE
BLOCKED
```

---

# 8. supplier_contacts

```text
supplier_contacts
────────────────────────────────────────────
id                  UUID PK
supplier_id         UUID FK

name                VARCHAR(200)
email               VARCHAR(320)
phone               VARCHAR(50)
role                VARCHAR(100)

is_primary          BOOLEAN

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

# 9. supplier_bank_accounts

Sensitive banking information.

```text
supplier_bank_accounts
────────────────────────────────────────────
id                  UUID PK
supplier_id         UUID FK

bank_name           VARCHAR(200)
account_name        VARCHAR(200)
account_reference   TEXT
routing_reference   TEXT

currency            CHAR(3)

is_primary          BOOLEAN
status              VARCHAR(20)

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Actual sensitive values must be encrypted.

---

# 10. purchase_orders

```text
purchase_orders
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK
supplier_id         UUID FK

po_number           VARCHAR(100)
erp_reference       VARCHAR(150)

currency            CHAR(3)

issue_date          DATE
delivery_date       DATE

total_amount        NUMERIC(18,2)
utilized_amount     NUMERIC(18,2)
remaining_amount    NUMERIC(18,2)

status              VARCHAR(20)
matching_status     VARCHAR(30)

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

PO status:

```text
OPEN
CLOSED
CANCELLED
```

Matching status:

```text
MATCHED
PARTIAL
UNMATCHED
```

---

# 11. purchase_order_lines

```text
purchase_order_lines
────────────────────────────────────────────
id                  UUID PK
purchase_order_id   UUID FK

line_number         INTEGER
description         TEXT

quantity            NUMERIC(18,4)
unit_price          NUMERIC(18,4)

tax_amount          NUMERIC(18,2)
line_amount         NUMERIC(18,2)

quantity_received   NUMERIC(18,4)
quantity_invoiced   NUMERIC(18,4)

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

# 12. goods_receipts

```text
goods_receipts
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK
purchase_order_id   UUID FK

receipt_number      VARCHAR(100)
receipt_date        DATE

status              VARCHAR(20)

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

# 13. goods_receipt_lines

```text
goods_receipt_lines
────────────────────────────────────────────
id                  UUID PK
goods_receipt_id    UUID FK
purchase_order_line_id UUID FK

quantity_received   NUMERIC(18,4)

created_at          TIMESTAMP
```

---

# 14. invoices

Core AP transaction.

```text
invoices
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK
supplier_id         UUID FK NULL
purchase_order_id   UUID FK NULL

invoice_number      VARCHAR(150)

invoice_date        DATE
due_date            DATE

currency            CHAR(3)

subtotal_amount     NUMERIC(18,2)
tax_amount          NUMERIC(18,2)
total_amount        NUMERIC(18,2)
paid_amount         NUMERIC(18,2)
remaining_amount    NUMERIC(18,2)

status              VARCHAR(30)

workflow_state      VARCHAR(40)

source              VARCHAR(40)

ai_confidence       NUMERIC(5,2)

assigned_to         UUID FK NULL

erp_reference       VARCHAR(150)

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

# Invoice Status

```text
RECEIVED
PROCESSING
EXCEPTION
PENDING_APPROVAL
APPROVED
REJECTED
SCHEDULED
PAID
SYNCED
ARCHIVED
```

---

# Invoice Sources

```text
EMAIL
PORTAL
UPLOAD
SCANNER
MOBILE
API
EDI
ERP
```

---

# 15. invoice_lines

```text
invoice_lines
────────────────────────────────────────────
id                  UUID PK
invoice_id          UUID FK

line_number         INTEGER
description         TEXT

quantity            NUMERIC(18,4)
unit_price          NUMERIC(18,4)

tax_rate            NUMERIC(8,4)
tax_amount          NUMERIC(18,2)

line_amount         NUMERIC(18,2)

po_line_id          UUID FK NULL

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

# 16. documents

Stores metadata for uploaded documents.

```text
documents
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK

entity_type         VARCHAR(50)
entity_id           UUID

file_name           VARCHAR(255)
mime_type           VARCHAR(100)

storage_key         TEXT
file_size           BIGINT
page_count          INTEGER

document_type       VARCHAR(50)

ocr_status          VARCHAR(30)
extraction_status   VARCHAR(30)

created_by          UUID FK
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

The actual file is stored in object storage.

---

# 17. invoice_extractions

Stores AI/OCR extraction results.

```text
invoice_extractions
────────────────────────────────────────────
id                  UUID PK
invoice_id          UUID FK

model_name          VARCHAR(150)
model_version       VARCHAR(100)

field_name          VARCHAR(100)
field_value         TEXT

confidence          NUMERIC(5,2)

page_number         INTEGER
bounding_box        JSONB

created_at          TIMESTAMP
```

Example:

```text
field_name = invoice_number
field_value = INV-1024
confidence = 98.4
```

---

# 18. validations

Stores validation results.

```text
validations
────────────────────────────────────────────
id                  UUID PK
invoice_id          UUID FK

rule_code           VARCHAR(100)
rule_name           VARCHAR(150)

status              VARCHAR(20)

message             TEXT

expected_value      TEXT
actual_value        TEXT

confidence          NUMERIC(5,2)

created_at          TIMESTAMP
```

Status:

```text
PASSED
FAILED
WARNING
SKIPPED
```

---

# 19. invoice_matches

Stores matching results.

```text
invoice_matches
────────────────────────────────────────────
id                  UUID PK
invoice_id          UUID FK

match_type          VARCHAR(30)

purchase_order_id   UUID FK NULL
po_line_id          UUID FK NULL
goods_receipt_id    UUID FK NULL

matched_amount      NUMERIC(18,2)
difference_amount   NUMERIC(18,2)

confidence          NUMERIC(5,2)

status              VARCHAR(20)

created_at          TIMESTAMP
```

Match types:

```text
PO
GOODS_RECEIPT
CONTRACT
PRICE
```

---

# 20. exceptions

```text
exceptions
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK
invoice_id          UUID FK

type                VARCHAR(50)
severity            VARCHAR(20)

title               VARCHAR(250)
description         TEXT

status              VARCHAR(30)

assigned_to         UUID FK NULL

resolution          TEXT
resolved_by         UUID FK NULL
resolved_at         TIMESTAMP

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Exception types:

```text
MISSING_PO
AMOUNT_CHANGED
TAX_DIFFERENCE
UNKNOWN_VENDOR
CURRENCY_MISMATCH
DUPLICATE
FRAUD_RISK
MISSING_SIGNATURE
INVALID_GST
MANUAL_REVIEW
```

---

# 21. approvals

```text
approvals
────────────────────────────────────────────
id                  UUID PK
invoice_id          UUID FK
approver_id         UUID FK

sequence_number     INTEGER

status              VARCHAR(20)

amount_limit        NUMERIC(18,2)

requested_at        TIMESTAMP
responded_at        TIMESTAMP

comment             TEXT

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Status:

```text
PENDING
APPROVED
REJECTED
DELEGATED
EXPIRED
```

---

# 22. payments

```text
payments
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK
invoice_id          UUID FK

payment_reference   VARCHAR(150)

amount              NUMERIC(18,2)
currency            CHAR(3)

payment_method      VARCHAR(50)

scheduled_date      DATE
processed_at        TIMESTAMP

status              VARCHAR(30)

batch_id            UUID FK NULL

failure_reason      TEXT

erp_reference       VARCHAR(150)

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Payment status:

```text
AWAITING_SCHEDULE
SCHEDULED
PROCESSING
PAID
FAILED
ON_HOLD
```

---

# 23. payment_batches

```text
payment_batches
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK

batch_number        VARCHAR(100)

payment_count       INTEGER
total_amount        NUMERIC(18,2)
currency            CHAR(3)

scheduled_date      DATE
processed_at        TIMESTAMP

status              VARCHAR(30)

created_by          UUID FK

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

# 24. workflow_instances

Tracks invoice workflow.

```text
workflow_instances
────────────────────────────────────────────
id                  UUID PK
invoice_id          UUID FK

workflow_version    VARCHAR(50)

current_state       VARCHAR(50)

started_at          TIMESTAMP
completed_at        TIMESTAMP

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

One active workflow instance per invoice.

---

# 25. workflow_transitions

Immutable transition history.

```text
workflow_transitions
────────────────────────────────────────────
id                  UUID PK
workflow_instance_id UUID FK

from_state          VARCHAR(50)
to_state            VARCHAR(50)

event               VARCHAR(100)

triggered_by        UUID FK NULL

reason              TEXT

created_at          TIMESTAMP
```

---

# 26. ai_results

Stores AI recommendations.

```text
ai_results
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK

entity_type         VARCHAR(50)
entity_id           UUID

capability          VARCHAR(100)

model_name          VARCHAR(150)
model_version       VARCHAR(100)

result              JSONB

confidence          NUMERIC(5,2)

recommendation      TEXT
explanation         TEXT

created_at          TIMESTAMP
```

Examples:

```text
DOCUMENT_CLASSIFICATION

VENDOR_MATCH

DUPLICATE_DETECTION

PO_MATCH

EXCEPTION_DETECTION

APPROVAL_RECOMMENDATION

PAYMENT_RECOMMENDATION
```

---

# 27. ai_feedback

Stores user feedback on AI.

```text
ai_feedback
────────────────────────────────────────────
id                  UUID PK
ai_result_id        UUID FK

user_id             UUID FK

action              VARCHAR(30)

original_value      TEXT
corrected_value     TEXT

comment             TEXT

created_at          TIMESTAMP
```

Actions:

```text
ACCEPTED
REJECTED
CORRECTED
DISMISSED
```

---

# 28. comments

Collaboration.

```text
comments
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK

entity_type         VARCHAR(50)
entity_id           UUID

user_id             UUID FK

body                TEXT

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

# 29. notifications

```text
notifications
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK
user_id             UUID FK

type                VARCHAR(50)

title               VARCHAR(250)
message             TEXT

entity_type         VARCHAR(50)
entity_id           UUID

status              VARCHAR(20)

read_at             TIMESTAMP
archived_at         TIMESTAMP

created_at          TIMESTAMP
```

Status:

```text
UNREAD
READ
ARCHIVED
```

---

# 30. notification_preferences

```text
notification_preferences
────────────────────────────────────────────
id                  UUID PK
user_id             UUID FK

notification_type   VARCHAR(50)

email_enabled       BOOLEAN
in_app_enabled      BOOLEAN

updated_at          TIMESTAMP
```

---

# 31. audit_logs

Immutable system audit.

```text
audit_logs
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK

user_id             UUID FK NULL

action              VARCHAR(100)

entity_type         VARCHAR(50)
entity_id           UUID

before_data         JSONB
after_data          JSONB

ip_address          INET
user_agent          TEXT

result              VARCHAR(20)

created_at          TIMESTAMP
```

Audit records cannot be updated or deleted by the application.

---

# 32. integrations

```text
integrations
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK

type                VARCHAR(50)
provider            VARCHAR(100)

status              VARCHAR(30)

configuration       JSONB

last_sync_at        TIMESTAMP
last_error          TEXT

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Secrets are encrypted.

---

# 33. sync_jobs

Tracks external synchronization.

```text
sync_jobs
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK

integration_id      UUID FK

entity_type         VARCHAR(50)

direction           VARCHAR(20)

status              VARCHAR(30)

records_processed   INTEGER
records_failed      INTEGER

started_at          TIMESTAMP
completed_at        TIMESTAMP

error_message       TEXT

created_at          TIMESTAMP
```

Direction:

```text
INBOUND
OUTBOUND
```

---

# 34. organization_settings

Organization-wide configuration.

```text
organization_settings
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK

setting_key         VARCHAR(150)
setting_value       JSONB

updated_by          UUID FK
updated_at          TIMESTAMP
```

Examples:

```text
default_currency

ai_confidence_threshold

po_required

duplicate_detection

gst_validation

session_timeout

fiscal_year
```

---

# 35. approval_rules

```text
approval_rules
────────────────────────────────────────────
id                  UUID PK
organization_id     UUID FK

name                VARCHAR(150)

min_amount          NUMERIC(18,2)
max_amount          NUMERIC(18,2)

department          VARCHAR(150) NULL

approval_type       VARCHAR(30)

sequence_number     INTEGER

approver_role_id    UUID FK NULL

active              BOOLEAN

created_at          TIMESTAMP
updated_at          TIMESTAMP
```

Approval types:

```text
AUTO
SEQUENTIAL
PARALLEL
```

---

# 36. api_tokens

Personal API tokens.

```text
api_tokens
────────────────────────────────────────────
id                  UUID PK
user_id             UUID FK

name                VARCHAR(150)

token_hash          TEXT

last_used_at        TIMESTAMP

expires_at          TIMESTAMP NULL

status              VARCHAR(20)

created_at          TIMESTAMP
revoked_at          TIMESTAMP NULL
```

Raw tokens are never stored.

---

# 37. user_sessions

```text
user_sessions
────────────────────────────────────────────
id                  UUID PK
user_id             UUID FK

session_reference   VARCHAR(150)

device              VARCHAR(150)
browser             VARCHAR(100)
operating_system    VARCHAR(100)

ip_address          INET
location            VARCHAR(150)

last_active_at      TIMESTAMP

created_at          TIMESTAMP
revoked_at          TIMESTAMP NULL
```

---

# RELATIONSHIPS

```text
organizations
      │
      ├──────── users
      │             │
      │             ├── user_roles ── roles
      │             │                    │
      │             │                    └── role_permissions ── permissions
      │             │
      │             ├── notifications
      │             ├── api_tokens
      │             └── sessions
      │
      ├──────── suppliers
      │             │
      │             └── supplier_bank_accounts
      │
      ├──────── purchase_orders
      │             │
      │             ├── purchase_order_lines
      │             └── goods_receipts
      │
      └──────── invoices
                    │
                    ├── invoice_lines
                    ├── documents
                    ├── invoice_extractions
                    ├── validations
                    ├── invoice_matches
                    ├── exceptions
                    ├── approvals
                    ├── payments
                    ├── workflow_instances
                    ├── ai_results
                    └── comments
```

---

# INVOICE RELATIONSHIP

```text
Supplier
   │
   └──────────────┐
                  ▼
              Invoice
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
      PO       Lines     Document
       │
       ▼
    Matching
       │
       ▼
   Validation
       │
       ▼
   Exception
       │
       ▼
   Approval
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

---

# REQUIRED INDEXES

## invoices

```text
organization_id

organization_id + status

organization_id + workflow_state

organization_id + supplier_id

organization_id + invoice_number

organization_id + due_date

organization_id + created_at
```

---

## suppliers

```text
organization_id

organization_id + supplier_code

organization_id + legal_name

organization_id + gst_number

organization_id + status
```

---

## purchase_orders

```text
organization_id

organization_id + po_number

organization_id + supplier_id

organization_id + status
```

---

## payments

```text
organization_id

organization_id + status

organization_id + scheduled_date

organization_id + invoice_id

batch_id
```

---

## exceptions

```text
organization_id

organization_id + status

organization_id + assigned_to

organization_id + severity

invoice_id
```

---

## notifications

```text
user_id + status

user_id + created_at

entity_type + entity_id
```

---

# DATA INTEGRITY

Foreign keys are required.

Examples:

```text
invoice.supplier_id
        ↓
suppliers.id
```

```text
invoice.purchase_order_id
        ↓
purchase_orders.id
```

```text
payment.invoice_id
        ↓
invoices.id
```

```text
approval.invoice_id
        ↓
invoices.id
```

---

# MONEY

Never use floating-point values.

Use:

```text
NUMERIC(18,2)
```

For quantities:

```text
NUMERIC(18,4)
```

Always store:

```text
Amount

Currency
```

Do not assume organization currency.

---

# DATES

Use:

```text
DATE
```

for business dates.

Use:

```text
TIMESTAMP WITH TIME ZONE
```

for system events.

Examples:

```text
Invoice Date → DATE

Due Date → DATE

Created At → TIMESTAMP WITH TIME ZONE

Payment Processed At → TIMESTAMP WITH TIME ZONE
```

---

# SOFT DELETION

Operational records are not deleted.

Use status where appropriate.

Examples:

```text
Supplier → INACTIVE

User → DEACTIVATED

API Token → REVOKED

Integration → DISCONNECTED
```

Audit records are immutable.

---

# TENANCY

Every organization owns its data.

Business tables include:

```text
organization_id
```

The API always applies organization filtering.

A user must never access another organization's records.

---

# TRANSACTIONS

Database transactions are required for:

```text
Invoice Approval

Invoice Rejection

Payment Scheduling

Payment Completion

Workflow Transition

Supplier Status Change

ERP Sync State Change
```

Example:

```text
Approve Invoice
      │
      ├── Update Invoice
      ├── Update Workflow
      ├── Create Audit
      └── Create Notification
              │
              ▼
          COMMIT
```

If one critical operation fails:

```text
ROLLBACK
```

---

# REPORTING

V1 reports query operational tables.

Do not create a separate data warehouse.

For expensive reports:

```text
Background Job

↓

Precomputed Result

↓

Cache
```

Only introduce a warehouse when actual scale requires it.

---

# DOCUMENT STORAGE

Database:

```text
Document Metadata
Storage Key
File Type
Size
Pages
Processing Status
```

Object Storage:

```text
PDF

Images

Scans

Attachments
```

Never store large documents directly inside relational tables.

---

# RETENTION

Retention rules are organization configurable.

Archived invoices remain accessible according to configured retention policy.

Audit logs follow the organization's compliance retention requirement.

Documents and their metadata must remain linked for the entire retention period.

---

# BACKUP

Minimum:

```text
Daily Full Backup

Point-in-Time Recovery

Encrypted Backup

Backup Verification
```

---

# MIGRATIONS

All schema changes use versioned migrations.

```text
001_initial_schema

002_add_invoice_ai

003_add_payment_batches

004_add_integrations
```

Never manually modify production schema.

---

# V1 EXCLUSIONS

Do not build:

```text
General Ledger

Accounts Receivable

Payroll

Inventory Management

Procurement Management

Expense Management

Full Banking Ledger

Custom BI Warehouse

Event-Sourcing Database

Multi-Database Microservices

Complex Data Lake
```

These are outside the AP SaaS scope.

---

# DATABASE PRINCIPLES

```text
Database
   │
   ├── Stores facts
   │
   ├── Enforces relationships
   │
   ├── Enforces integrity
   │
   └── Provides transactions

Workflow Engine
   │
   └── Decides what happens next

AI
   │
   └── Provides recommendations

ERP
   │
   └── Remains external system of record where applicable
```

---

# Locked Decisions

✓ PostgreSQL.

✓ Relational schema.

✓ Multi-tenant organization model.

✓ `organization_id` on business entities.

✓ UUID primary keys.

✓ Fixed-precision monetary values.

✓ Documents stored in object storage.

✓ Database stores document metadata.

✓ Workflow state stored explicitly.

✓ Workflow transition history stored.

✓ AI results stored separately from business facts.

✓ AI feedback stored.

✓ Audit logs immutable.

✓ No hard deletion of operational records.

✓ Foreign keys enforced.

✓ Transactions used for financial operations.

✓ V1 reports use operational data.

✓ No data warehouse in V1.

✓ No event-sourcing.

✓ No microservice-specific databases.

✓ Versioned database migrations.

✓ Keep the schema relational and simple.
