# 12. Backend Architecture Specification

**Version:** 1.0 (Locked)

---

# Objective

The backend is a **modular monolith** designed for simplicity, maintainability, and predictable growth.

It orchestrates business logic, workflow execution, AI services, integrations, and persistence while exposing a secure API to the frontend.

It answers one question:

> **"How is business logic executed safely and consistently?"**

V1 prioritizes **simplicity over distributed complexity (YAGNI)**.

---

# Architecture Principles

- Modular Monolith
- API First
- Domain Driven Structure
- Stateless Services
- Event-Driven Internally
- Database as Source of Truth
- Workflow Engine Owns Business Logic
- AI is a Supporting Service
- ERP is the External System of Record after synchronization
- No Microservices in V1

---

# High-Level Architecture

```text
                           Frontend
                               │
                               ▼
                        REST API Gateway
                               │
────────────────────────────────────────────────────────────
                               │
             Authentication & Authorization
                               │
────────────────────────────────────────────────────────────
                               │
                               ▼
                     Application Layer
────────────────────────────────────────────────────────────
│
├── Invoice Module
├── Inbox Module
├── OCR Module
├── AI Module
├── Validation Module
├── Matching Module
├── Exception Module
├── Approval Module
├── Payment Module
├── Supplier Module
├── Purchase Order Module
├── Reports Module
├── Notification Module
├── Workflow Engine
├── Audit Module
├── Settings Module
└── Integration Module
────────────────────────────────────────────────────────────
                               │
                               ▼
                      Infrastructure Layer
────────────────────────────────────────────────────────────
│
├── Database
├── Object Storage
├── Email
├── OCR Engine
├── ERP Connector
├── AI Models
├── Scheduler
└── Cache
────────────────────────────────────────────────────────────
```

---

# Layered Architecture

```text
Presentation Layer

↓

API Layer

↓

Application Layer

↓

Domain Layer

↓

Infrastructure Layer

↓

Database
```

Each layer communicates only with the layer below it.

---

# Folder Structure

```text
backend/

├── api/
│
├── auth/
│
├── modules/
│   ├── inbox/
│   ├── invoices/
│   ├── validation/
│   ├── matching/
│   ├── approvals/
│   ├── payments/
│   ├── suppliers/
│   ├── purchase-orders/
│   ├── reports/
│   ├── exceptions/
│   ├── notifications/
│   ├── workflow/
│   ├── audit/
│   ├── settings/
│   └── users/
│
├── ai/
│
├── integrations/
│
├── infrastructure/
│
├── shared/
│
└── config/
```

Feature-first organization.

---

# Core Modules

## 1. Authentication

Responsibilities

```text
Login

Logout

JWT

Refresh Token

MFA

Password Reset
```

---

## 2. User Module

Responsibilities

```text
Users

Roles

Permissions

Profile
```

---

## 3. Inbox Module

Responsibilities

```text
Upload

Email Import

API Import

Scanner Import

Storage
```

Creates invoices.

---

## 4. Invoice Module

Owns

```text
Invoice Lifecycle

Invoice Metadata

Invoice Details
```

Does not execute workflow.

---

## 5. OCR Module

Responsibilities

```text
OCR

Text Extraction

Layout Detection

Document Parsing
```

Returns structured content.

---

## 6. AI Module

Responsibilities

```text
Classification

Extraction

Matching

Suggestions

Confidence
```

No financial authority.

---

## 7. Validation Module

Executes

```text
Duplicate Rules

GST Rules

Currency Rules

Date Rules

Business Rules
```

Returns validation results.

---

## 8. Matching Module

Matches

```text
Purchase Orders

Goods Receipt

Contracts
```

Returns match result.

---

## 9. Exception Module

Creates

```text
Exceptions

Assignments

Resolution
```

---

## 10. Approval Module

Responsibilities

```text
Routing

Approval

Delegation

Escalation
```

---

## 11. Payment Module

Responsibilities

```text
Scheduling

Batching

Execution Requests

Status
```

Actual banking performed externally.

---

## 12. Supplier Module

Responsibilities

```text
Supplier Master

Supplier Validation
```

---

## 13. Purchase Order Module

Responsibilities

```text
PO Lookup

PO Matching

PO Balance
```

Read-only.

---

## 14. Reports Module

Responsibilities

```text
Analytics

KPIs

Exports
```

Read-only.

---

## 15. Notification Module

Responsibilities

```text
In-App

Email

Templates
```

Triggered by events.

---

## 16. Workflow Engine

Owns

```text
Workflow

State Machine

Transitions

Business Rules
```

No UI.

---

## 17. Audit Module

Stores

```text
Every Action

Every Transition

Every Login

Every Change
```

Immutable.

---

## 18. Settings Module

Responsibilities

```text
Organization

Workflow Config

Security

System Configuration
```

---

## 19. Integration Module

Handles

```text
ERP

Accounting

Banking

SMTP

Webhook

API
```

---

# Request Lifecycle

```text
HTTP Request

↓

Authentication

↓

Authorization

↓

Validation

↓

Application Service

↓

Workflow Engine

↓

Database

↓

Audit

↓

Notification

↓

Response
```

---

# Event Flow

Internal events

```text
InvoiceCreated

ValidationCompleted

ApprovalRequested

InvoiceApproved

PaymentScheduled

PaymentCompleted

ERPSynced

InvoiceArchived
```

Consumers

```text
Notifications

Reports

Audit

Dashboard
```

---

# Database Access

Pattern

```text
Controller

↓

Service

↓

Repository

↓

Database
```

Controllers never query the database directly.

---

# File Storage

Stores

```text
Invoices

Attachments

Audit Exports

Report Exports
```

Database stores metadata only.

---

# Caching

Cache

```text
Dashboard

Reports

Settings

Permissions
```

Do not cache

```text
Workflow State

Payments

Approvals
```

---

# Background Jobs

Scheduler executes

```text
Email Polling

ERP Sync

Payment Queue

Notification Delivery

Report Generation

Cleanup
```

Asynchronous.

---

# API Style

REST.

Resources

```text
/invoices

/payments

/approvals

/suppliers

/purchase-orders

/exceptions

/reports

/settings

/profile
```

Consistent CRUD patterns.

---

# Error Handling

Standard response

```text
Success

Validation Error

Business Error

Unauthorized

Forbidden

Not Found

Conflict

Server Error
```

No stack traces exposed.

---

# Security

Authentication

```text
JWT

Refresh Token

MFA
```

Authorization

```text
Role Based Access Control (RBAC)
```

Validation

```text
Server Side
```

Encryption

```text
HTTPS

Encrypted Secrets

Hashed Passwords
```

---

# Audit Strategy

Every operation logs

```text
User

Timestamp

Action

Resource

Before

After

IP

Result
```

Immutable.

---

# Performance Targets

```text
API Response

<300 ms

Authentication

<500 ms

Invoice Fetch

<200 ms

Workflow Decision

<100 ms

Report Export

Background

File Upload

Streaming
```

---

# Scalability Strategy

V1

```text
Single Application

Single Database

Single Cache
```

Scale by

```text
Vertical Scaling

Read Replicas

Background Workers
```

Microservices only if future scale demands it.

---

# Technology Boundaries

The architecture does **not** depend on a specific framework.

Implementation may use:

```text
Node.js

Express / Fastify / NestJS

PostgreSQL / MySQL

Redis

Object Storage

Any OCR Engine

Any AI Provider
```

Technology can change without changing architecture.

---

# Backend Principles

- Modular over distributed.
- Business logic lives in services.
- Workflow owns state transitions.
- Controllers remain thin.
- Database is the source of truth.
- Events decouple modules.
- Audit everything.
- Keep modules independent.
- Prefer composition over inheritance.
- YAGNI before abstraction.

---

# Locked Decisions

✓ Modular Monolith architecture.

✓ Feature-based modules.

✓ REST API.

✓ Layered architecture.

✓ Workflow Engine owns business logic.

✓ Repository pattern for data access.

✓ Internal event bus.

✓ Immutable audit logging.

✓ Background jobs for asynchronous work.

✓ No microservices in V1.
