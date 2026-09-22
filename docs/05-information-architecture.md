# 05. SaaS Information Architecture

**Version:** 1.0 (Locked)

---

# Objective

Define the complete application structure.

This document answers:

- What pages exist?
- How users navigate?
- What belongs on each page?
- How pages relate to the AP workflow?

This is the master navigation blueprint.

---

# Navigation Principles

## 1. Flat Navigation

Maximum navigation depth:

```text
Sidebar
    ↓
Page
    ↓
Details
```

No page should require more than two navigation levels.

---

## 2. Workflow First

Navigation follows the Accounts Payable workflow.

```text
Receive

↓

Review

↓

Approve

↓

Pay

↓

Complete
```

Navigation is based on work.

Not departments.

---

## 3. One Responsibility Per Page

Every page solves one problem.

Example

Good

```text
Invoices
```

Bad

```text
Invoice + Supplier + Reports + Settings
```

---

## 4. Universal Search

Users should not navigate when searching.

Search should find:

- Invoice
- Vendor
- Payment
- Purchase Order
- User
- Comment
- Reference Number
- GST
- Audit

---

# Application Structure (Canonical 11-Item Navigation per Doc 18 §18.2)

```text
Avarta AP Workspace

Core Workspace:
├── Overview (Mission Control / Actionable Queue)
├── Inbox (Intake & OCR Extraction Workstation)
├── Invoices (All Invoices Register & Filter Hub)
├── Exceptions (14 Operational & Statutory Exception Queues)
├── Approvals (Tiered Multi-Level Approval Queue)
└── Payments (Disbursement Schedule & Batch Execution)

Vendors & Procurement:
├── Suppliers (Vendor Master & GSTIN Verification)
└── Purchase Orders (PO Tracking & Goods Receipts)

Intelligence & Compliance:
├── Reports (AP Aging, DPO & Cash Flow Analytics)
├── Archive (Immutable Historical General Ledger)
└── Settings (Company Profile, ERP Sync & Audit Policies)

(Top Bar Hub: Profile & Notifications; Audit is a tab on Invoice/Exception Details)
```

---

# Navigation Layout

```text
+------------------------------------------------------+

Logo

────────────────────────

Dashboard

Inbox

Invoices

Exceptions

Approvals

Payments

Suppliers

Purchase Orders

Reports

Audit

────────────────────────

Integrations

Settings

────────────────────────

User

+------------------------------------------------------+
```

---

# Page Hierarchy

```text
Dashboard

Inbox

Invoices
    └── Invoice Details

Exceptions
    └── Exception Details

Approvals
    └── Approval Details

Payments
    └── Payment Details

Suppliers
    └── Supplier Details

Purchase Orders
    └── Purchase Order Details

Reports

Audit

Integrations

Settings
```

Every module has only one detail page.

No additional nesting.

---

# Dashboard

## Purpose

Mission Control.

The first screen users see.

---

## Contents

```text
Dashboard

├── KPI Cards
├── Today's Work
├── Recent Activity
├── Pending Approvals
├── Exceptions
├── Upcoming Payments
└── Quick Actions
```

---

## Primary Actions

- Upload Invoice
- Review Invoice
- Approve
- Schedule Payment

---

# Inbox

## Purpose

Entry point for all incoming invoices.

---

## Contents

```text
Inbox

├── Received
├── Processing
├── Ready
└── Failed
```

---

## Primary Actions

- Upload
- Retry
- Open Invoice

---

# Invoices

## Purpose

Manage every invoice.

---

## Contents

```text
Invoices

├── Table
├── Filters
├── Search
├── Saved Views
└── Bulk Actions
```

---

## Invoice Details

```text
Invoice

├── Document Preview
├── Extracted Data
├── Validation
├── Matching
├── Comments
├── Timeline
└── Audit
```

---

## Primary Actions

- Edit
- Validate
- Approve
- Reject
- Export

---

# Exceptions

## Purpose

Resolve validation failures.

---

## Contents

```text
Exceptions

├── Queue
├── Filters
├── Severity
└── Assigned To
```

---

## Exception Details

```text
Exception

├── Issue
├── Invoice
├── Suggested Fix
├── Comments
└── Timeline
```

---

## Primary Actions

- Resolve
- Assign
- Comment
- Retry Validation

---

# Approvals

## Purpose

Manage approval workflow.

---

## Contents

```text
Approvals

├── Waiting
├── Approved
├── Rejected
└── Delegated
```

---

## Approval Details

```text
Approval

├── Invoice
├── Approval Chain
├── Comments
└── Timeline
```

---

## Primary Actions

- Approve
- Reject
- Delegate

---

# Payments

## Purpose

Manage scheduled and completed payments.

---

## Contents

```text
Payments

├── Scheduled
├── Processing
├── Paid
└── Failed
```

---

## Payment Details

```text
Payment

├── Invoice
├── Vendor
├── Amount
├── Method
├── Timeline
└── Audit
```

---

## Primary Actions

- Schedule
- Hold
- Cancel

---

# Suppliers

## Purpose

Manage supplier records.

---

## Contents

```text
Suppliers

├── Directory
├── Contacts
├── Banking
├── Documents
└── History
```

---

## Supplier Details

```text
Supplier

├── Overview
├── Contacts
├── Bank Details
├── Invoices
├── Payments
└── Timeline
```

---

## Primary Actions

- Edit
- Archive
- Contact

---

# Purchase Orders

## Purpose

Support invoice matching.

---

## Contents

```text
Purchase Orders

├── Open
├── Closed
├── Matched
└── Unmatched
```

---

## Purchase Order Details

```text
Purchase Order

├── Header
├── Line Items
├── Matching
├── Invoices
└── Timeline
```

---

## Primary Actions

- Match
- View

---

# Reports

## Purpose

Business reporting.

---

## Contents

```text
Reports

├── Spend
├── Payments
├── Processing
├── Exceptions
├── Suppliers
└── Custom
```

---

## Primary Actions

- Filter
- Export

---

# Audit

## Purpose

Complete activity history.

---

## Contents

```text
Audit

├── Activities
├── Users
├── Actions
├── Exports
└── Search
```

---

## Primary Actions

- Search
- Export

---

# Integrations

## Purpose

Connect external systems.

---

## Contents

```text
Integrations

├── Accounting
├── ERP
├── Email
├── API
└── Webhooks
```

---

## Primary Actions

- Connect
- Disconnect
- Sync

---

# Settings

## Purpose

Application configuration.

---

## Contents

```text
Settings

├── Organization
├── Users
├── Roles
├── Approval Rules
├── Notifications
├── Security
└── Preferences
```

---

## Primary Actions

- Save

---

# Global Layout

Every page follows the same layout.

```text
+------------------------------------------------------+

Breadcrumb

Page Title

Page Actions

--------------------------------------------------------

Filters / Search

--------------------------------------------------------

Primary Content

--------------------------------------------------------

Inspector Panel

--------------------------------------------------------

Bulk Actions

+------------------------------------------------------+
```

---

# Global Components

Every page may use these components.

```text
Search

Filters

Table

Inspector

Timeline

Comments

Attachments

Activity Feed

Status Badge

Action Bar

Modal

Toast
```

---

# Global Search Scope

Search indexes:

```text
Invoices

Suppliers

Payments

Purchase Orders

Users

Comments

Attachments

Reference Numbers

GST

Audit Records
```

---

# User Journey

```text
Dashboard

↓

Inbox

↓

Invoice

↓

Validation

↓

Exception (if required)

↓

Approval

↓

Payment

↓

Archive
```

The workflow always moves forward.

Users should never need to switch between unrelated modules.

---

# Access Model

```text
Administrator

Finance Manager

Finance Executive

Approver

Read Only
```

Permissions are role-based.

---

# Navigation Rules

- Maximum two navigation levels.
- Sidebar is always visible on desktop.
- Global Search is always available.
- Primary action is always visible.
- Every detail page opens in the same layout.
- Navigation follows the business workflow.
- No duplicate pages.
- No hidden workflows.

---

# Future Modules

These are intentionally excluded.

```text
Accounting

Inventory

Payroll

CRM

Procurement

Treasury

Manufacturing

HR
```

These belong to external systems.

---

# Locked Information Architecture

## Primary Navigation

```text
Dashboard
Inbox
Invoices
Exceptions
Approvals
Payments
Suppliers
Purchase Orders
Reports
Audit
Integrations
Settings
```

## Detail Pages

One detail page per module.

## Navigation Depth

Maximum two levels.

## Primary Entry

Dashboard.

## Primary Workflow

Dashboard

↓

Inbox

↓

Invoices

↓

Exceptions

↓

Approvals

↓

Payments

↓

Archive

## Product Principle

One workspace.

One workflow.

One navigation model.
