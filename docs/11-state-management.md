# 11. State Management Specification

**Version:** 1.0 (Locked)

---

# Objective

The State Management layer is responsible for maintaining a **single, consistent source of truth** across the application.

Its purpose is to synchronize UI, business data, workflow state, and server state while minimizing unnecessary updates.

It answers one question:

> **"What is the current state of the application?"**

State Management is **not** responsible for business logic.

Business logic belongs to the Workflow Engine.

---

# Design Principles

- Single source of truth.
- Server owns business data.
- UI owns presentation state.
- Immutable updates.
- Predictable state changes.
- Event-driven updates.
- Minimal global state.
- Derived data instead of duplicated data.

---

# High-Level Architecture

```text
Server
      │
      ▼
API Layer
      │
      ▼
Server Cache
      │
      ▼
Application State
      │
      ▼
UI Components
```

---

# State Categories

The application uses five distinct state types.

```text
Application State

↓

Server State

↓

Workflow State

↓

UI State

↓

Session State
```

Each category has a single responsibility.

---

# 1. Server State

Purpose

Represents data stored on the backend.

Examples

```text
Invoices

Suppliers

Purchase Orders

Payments

Approvals

Exceptions

Users

Reports

Settings
```

Characteristics

```text
Read from API

Cached

Invalidated

Refetched

Never manually duplicated
```

---

# 2. Workflow State

Purpose

Represents invoice lifecycle.

Example

```text
Received

Captured

Validated

Matching

Approval

Payment

ERP Sync

Archived
```

Only one workflow state exists per invoice.

Workflow state originates from the Workflow Engine.

The UI never changes workflow directly.

---

# 3. UI State

Purpose

Controls presentation.

Examples

```text
Open Dialog

Selected Row

Expanded Panel

Sidebar State

Active Tab

Current Filter

Search Text

Current Page

Sort Order
```

Never stored on the server.

---

# 4. Session State

Purpose

Represents logged-in user.

Stores

```text
User

Role

Permissions

Organization

Authentication

Preferences

Theme

Language
```

Destroyed on logout.

---

# 5. Temporary State

Short-lived state.

Examples

```text
Upload Progress

Drag Position

Hover State

Loading State

Snackbar

Context Menu
```

Component-local only.

---

# State Ownership

```text
Server
│
├── Business Data
├── Workflow
├── Audit
└── Reports

Application
│
├── Authentication
├── Permissions
└── Preferences

Component
│
├── Modal
├── Form
├── Selection
└── Hover
```

State belongs to the lowest possible owner.

---

# Global Store

Only the following are global.

```text
Current User

Permissions

Theme

Organization

Notification Count

Global Search

Application Settings
```

Everything else remains local or server-managed.

---

# Server Cache

Cached entities

```text
Invoices

Invoice Details

Suppliers

Payments

Purchase Orders

Approvals

Exceptions

Reports
```

Cache invalidation occurs after successful mutations.

---

# Entity Relationships

```text
Supplier

↓

Invoices

↓

Payments

↓

ERP

Purchase Order

↓

Invoices

↓

Approval

↓

Payment
```

Relationships are normalized.

---

# Normalized Store

Entities stored separately.

```text
Invoices

Suppliers

PurchaseOrders

Payments

Approvals

Exceptions
```

Relationships reference IDs.

Example

```text
Invoice

supplierId

poId

approvalId

paymentId
```

Never duplicate entity data.

---

# Data Fetch Strategy

List Pages

```text
Pagination

Server-side Search

Server-side Filters

Lazy Loading
```

Detail Pages

```text
Fetch On Demand

Cache

Reuse Cache
```

---

# State Lifecycle

```text
API Request

↓

Loading

↓

Success

↓

Cached

↓

Updated

↓

Invalidated

↓

Refetch
```

Every server request follows this lifecycle.

---

# Mutations

Operations

```text
Create

Update

Approve

Reject

Archive

Upload

Schedule

Execute Payment
```

Flow

```text
User Action

↓

API

↓

Workflow

↓

Success

↓

Cache Update

↓

UI Refresh
```

---

# Optimistic Updates

Allowed

```text
Read Status

Selection

Local Preferences
```

Not Allowed

```text
Approval

Payment

ERP Sync

Financial Values

Workflow State
```

Financial operations require server confirmation.

---

# Loading States

Every server request has four states.

```text
Idle

Loading

Success

Error
```

Never use global loading screens.

Only affected sections display loading.

---

# Error States

Each request handles errors independently.

Example

```text
Supplier Load Failed

Invoices Continue Working
```

No cascading failures.

---

# Form State

Managed locally.

Contains

```text
Values

Validation

Dirty State

Touched Fields

Errors
```

Destroyed after submission.

---

# Search State

Search is page-specific.

Contains

```text
Search Text

Filters

Sort

Pagination
```

Preserved while navigating within the page.

---

# Filter State

Each page owns its filters.

Examples

```text
Invoices

Payments

Suppliers

Reports
```

Filters never affect other pages.

---

# Selection State

Maintains

```text
Selected Rows

Current Row

Focused Row
```

Reset after navigation.

---

# Notification State

Stores

```text
Unread Count

Recent Notifications
```

Notification details fetched when opened.

---

# Permission State

Loaded after login.

Contains

```text
Modules

Actions

Roles
```

Used for

```text
Menu

Buttons

Pages

Actions
```

Permissions are never hardcoded.

---

# Refresh Strategy

Automatic refresh

```text
Workflow Completion

Payment Completion

Approval Completion

ERP Sync
```

Manual refresh

```text
Reports

Dashboard
```

---

# Persistence

Persist across refresh

```text
Theme

Language

Sidebar

Table Preferences
```

Do not persist

```text
Selection

Dialogs

Uploads

Temporary Forms
```

---

# Event Flow

```text
User Action

↓

Mutation

↓

Workflow Engine

↓

Database

↓

Cache Update

↓

UI Update
```

The UI always reflects confirmed server state.

---

# Offline Behavior

V1

```text
Not Supported
```

If connection is lost

```text
Show Offline Banner

Disable Mutations

Retry Automatically
```

---

# Security Rules

Sensitive state never stored in browser.

Never store

```text
Passwords

Access Tokens (Readable)

Bank Details

Financial Secrets
```

Permissions always validated by server.

---

# Performance Targets

```text
Navigation

<100 ms

Local Update

<16 ms

Server Cache Read

<20 ms

List Refresh

<500 ms

Detail Refresh

<300 ms
```

---

# State Principles

- Server is the source of truth.
- UI reflects server state.
- Keep state local whenever possible.
- Normalize entities.
- Avoid duplication.
- Cache aggressively.
- Invalidate intelligently.
- Never trust client-side financial state.

---

# Recommended Architecture

```text
Presentation Layer
        │
        ▼
Feature Components
        │
        ▼
State Layer
        │
        ├── UI State
        ├── Session State
        ├── Server Cache
        └── Workflow State
                │
                ▼
API Layer
                │
                ▼
Workflow Engine
                │
                ▼
Database
```

---

# Locked Decisions

✓ Server is the single source of truth.

✓ Five distinct state categories.

✓ Workflow state owned by the Workflow Engine.

✓ Business entities normalized.

✓ Minimal global state.

✓ Component-local UI state by default.

✓ Financial operations require server confirmation.

✓ Automatic cache invalidation after mutations.

✓ No offline mode in V1.

✓ State management remains separate from business logic.
