# 09. Workflow Engine Specification

**Version:** 1.0 (Locked)

---

# Objective

The Workflow Engine is the **core orchestration layer** of the Accounts Payable platform.

It controls how invoices move through the system, determines the next action, executes business rules, and maintains a complete audit trail.

It answers one question:

> **"What should happen next?"**

The Workflow Engine contains **no user interface**.

It is a backend service responsible for state transitions.

---

# Responsibilities

The Workflow Engine is responsible for:

- Workflow orchestration
- State management
- Business rule execution
- Validation execution
- Assignment
- Approval routing
- Exception routing
- Payment routing
- ERP synchronization
- Audit logging
- Notification triggering

---

# Design Principles

- One invoice has one active state.
- Every transition is deterministic.
- No skipped workflow steps.
- Every action is auditable.
- Workflow is event-driven.
- State determines available actions.
- Failed transitions never corrupt state.

---

# Workflow Overview

```text
Receive Invoice
        │
        ▼
Capture
        │
        ▼
Validate
        │
        ├──────────────┐
        ▼              │
Passed              Failed
        │              │
        ▼              ▼
Matching        Exception Queue
        │              │
        ▼              │
Matched          Resolve Exception
        │              │
        ▼              ▼
Approval ◄─────────────┘
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

# Complete Workflow States

```text
Received

Captured

Validating

Validation Failed

Validated

Matching

Matching Failed

Waiting Approval

Approved

Rejected

Scheduled

Processing Payment

Paid

ERP Sync

Archived
```

Only one active state exists at any time.

---

# State Machine

```text
Received
      │
      ▼
Captured
      │
      ▼
Validating
      │
      ├──────────────┐
      ▼              ▼
Validated      Validation Failed
      │              │
      ▼              ▼
Matching    Exception Queue
      │              │
      ├──────────────┐
      ▼              ▼
Matched      Matching Failed
      │              │
      ▼              │
Approval ◄───────────┘
      │
      ├──────────────┐
      ▼              ▼
Approved        Rejected
      │              │
      ▼              ▼
Payment     Exception Queue
      │
      ▼
ERP Sync
      │
      ▼
Archived
```

---

# Workflow Stages

## Stage 1

Receive Invoice

Sources

```text
Email

Supplier Portal

Upload

Scanner

Mobile

API

EDI

ERP Import
```

Output

```text
Invoice Created
```

---

## Stage 2

Capture

Operations

```text
OCR

AI Extraction

Barcode

QR

Language Detection

Document Classification
```

Output

```text
Structured Invoice
```

---

## Stage 3

Validation

Runs

```text
Required Fields

Vendor

Duplicate

Currency

GST

Dates

PO

Amount

Tax

AI Confidence
```

Output

```text
Pass

or

Exception
```

---

## Stage 4

Matching

Runs

```text
PO Match

Goods Receipt

Contract

Price
```

Output

```text
Matched

Partial

Failed
```

---

## Stage 5

Approval

Routing

```text
Auto

Sequential

Parallel

Delegation

Escalation
```

Output

```text
Approved

Rejected
```

---

## Stage 6

Payment

Operations

```text
Schedule

Batch

Hold

Execute

Confirmation
```

Output

```text
Paid

Failed
```

---

## Stage 7

ERP Sync

Operations

```text
Journal

Vendor Balance

Payment Status

PO Status

Audit
```

---

## Stage 8

Archive

Operations

```text
Index

Search

Compliance

Retention
```

---

# Workflow Events

Every transition generates an event.

```text
InvoiceReceived

CaptureCompleted

ValidationStarted

ValidationPassed

ValidationFailed

ExceptionAssigned

ExceptionResolved

MatchingCompleted

ApprovalRequested

Approved

Rejected

PaymentScheduled

PaymentStarted

PaymentCompleted

PaymentFailed

ERPSynced

Archived
```

---

# Transition Rules

| Current State | Event | Next State |
|---------------|-------|------------|
| Received | Capture Complete | Captured |
| Captured | Validation Start | Validating |
| Validating | Success | Validated |
| Validating | Failure | Validation Failed |
| Validated | Matching Complete | Waiting Approval |
| Validation Failed | Resolved | Validated |
| Waiting Approval | Approved | Scheduled |
| Waiting Approval | Rejected | Validation Failed |
| Scheduled | Payment Run | Processing Payment |
| Processing Payment | Success | Paid |
| Processing Payment | Failure | Scheduled |
| Paid | ERP Success | ERP Sync |
| ERP Sync | Complete | Archived |

---

# Business Rule Engine

Business rules execute before transitions.

Categories

```text
Validation

Approval

Payment

Security

Compliance
```

Rule execution order

```text
System Rules

↓

Organization Rules

↓

Workflow Rules

↓

User Permissions
```

---

# Approval Engine

Determines approvers.

Inputs

```text
Invoice Amount

Department

Vendor

Currency

Business Unit
```

Output

```text
Approver List
```

Supports

```text
Auto

Sequential

Parallel
```

---

# Assignment Engine

Assigns work.

Supports

```text
Manual

Automatic

Round Robin

Manager Assignment
```

One owner per work item.

---

# Exception Engine

Creates exception records.

Severity

```text
Critical

High

Medium

Low
```

Automatically determines

```text
Owner

Priority

SLA
```

---

# Notification Engine

Triggered by workflow events.

Examples

```text
Approval Requested

Invoice Assigned

Payment Failed

Exception Created

Workflow Complete
```

Notifications never alter workflow.

---

# Audit Engine

Every transition creates

```text
Timestamp

User

Action

Previous State

New State

Comments

Source
```

Immutable.

---

# SLA Engine

Tracks elapsed time.

Measures

```text
Capture

Validation

Approval

Payment

Resolution
```

Generates

```text
Warning

Overdue
```

---

# Retry Engine

Supports

```text
Validation Retry

ERP Retry

Payment Retry

OCR Retry
```

Retries are logged.

Maximum retry count configurable.

---

# Error Handling

Failures never stop the workflow engine.

Failures create

```text
Exception

Audit Record

Notification
```

Invoice remains recoverable.

---

# Parallel Processing

Supported

```text
OCR

AI Extraction

Validation Rules

Notifications
```

Not supported

```text
Approval Decisions

State Changes

Payments
```

State transitions remain sequential.

---

# Concurrency Rules

Invoice locking

```text
Optimistic Locking
```

One active editor.

Concurrent updates rejected.

---

# Event Bus

Every completed transition publishes an event.

Consumers

```text
Notification Service

Audit Service

ERP Connector

Reporting

Dashboard
```

Workflow Engine never directly updates UI.

---

# Workflow APIs

Core operations

```text
Create Invoice

Start Workflow

Validate

Retry Validation

Approve

Reject

Schedule Payment

Execute Payment

Sync ERP

Archive
```

---

# Performance Targets

```text
Workflow Decision

<100 ms

Validation

<2 seconds

Approval Transition

<500 ms

Payment Scheduling

<500 ms

ERP Sync

Background

Notification

<1 second
```

---

# Recovery Rules

After system restart

```text
Resume Running Jobs

Retry Failed Jobs

Restore Queue

Replay Events
```

No invoice lost.

---

# Security Rules

Workflow actions require permissions.

Transitions validated server-side.

Every request authenticated.

Every transition authorized.

Audit cannot be bypassed.

---

# Acceptance Criteria

Invoice progresses through every state correctly.

Invalid transitions are rejected.

Workflow always deterministic.

Exceptions created correctly.

Approvals route correctly.

Payments execute correctly.

ERP synchronization succeeds.

Audit generated for every transition.

Notifications triggered correctly.

Archived invoices become immutable.

---

# Workflow Principles

- State-driven.
- Event-driven.
- Deterministic.
- Recoverable.
- Auditable.
- Secure.
- Observable.
- Extensible without changing existing states.

---

# Locked Decisions

✓ Single state machine.

✓ One active state per invoice.

✓ Event-driven architecture.

✓ Sequential state transitions.

✓ Business rules execute before transitions.

✓ Audit on every transition.

✓ Notifications triggered by events.

✓ Retry engine for recoverable failures.

✓ ERP synchronization before archive.

✓ Archive is the terminal state.
