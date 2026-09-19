Below is the **locked V1 API contract**. It follows the database, workflow engine, AI behavior, and state-management decisions already established. No extra API surface is added beyond what the AP SaaS needs.

```markdown id="38417"
# 14. API Contracts

**Version:** 1.0  
**Status:** LOCKED

---

# 14.1 API Objective

The API is the single interface between the frontend and backend.

```text
Frontend
   │
   ▼
REST API
   │
   ├── Authentication
   ├── Invoices
   ├── Suppliers
   ├── Purchase Orders
   ├── Validation
   ├── Matching
   ├── Exceptions
   ├── Approvals
   ├── Payments
   ├── Notifications
   ├── Reports
   ├── AI
   ├── Workflow
   ├── Integrations
   └── Settings
```

The frontend never directly accesses:

```text
Database
Object Storage
Workflow Engine
AI Provider
ERP
Payment Provider
```

---

# 14.2 API Principles

- REST.
- JSON by default.
- HTTPS only.
- Stateless requests.
- Server owns business state.
- Server validates every request.
- Server validates permissions.
- Workflow Engine controls state transitions.
- Financial operations require server confirmation.
- Consistent response format.
- Consistent error format.
- Pagination for lists.
- Filtering performed server-side.
- No GraphQL in V1.
- No WebSocket requirement in V1.

---

# 14.3 Base URL

Production:

```text
/api/v1
```

Example:

```text
/api/v1/invoices
```

---

# 14.4 Authentication

## Login

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "name": "John Smith",
    "email": "user@example.com",
    "organizationId": "uuid"
  },
  "accessToken": "token",
  "expiresIn": 900
}
```

---

# Refresh Token

```http
POST /api/v1/auth/refresh
```

Response:

```json
{
  "accessToken": "token",
  "expiresIn": 900
}
```

---

# Logout

```http
POST /api/v1/auth/logout
```

Response:

```json
{
  "success": true
}
```

---

# Current User

```http
GET /api/v1/auth/me
```

Response:

```json
{
  "id": "uuid",
  "name": "John Smith",
  "email": "user@example.com",
  "organizationId": "uuid",
  "roles": [
    "Finance Manager"
  ],
  "permissions": [
    "invoice.read",
    "invoice.approve",
    "payment.schedule"
  ]
}
```

---

# 14.5 Standard Headers

Request:

```http
Authorization: Bearer <token>
Content-Type: application/json
X-Request-ID: <uuid>
```

File upload:

```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

---

# 14.6 Standard Success Response

Single resource:

```json
{
  "data": {},
  "meta": {}
}
```

Collection:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

---

# 14.7 Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invoice amount is invalid.",
    "details": [
      {
        "field": "totalAmount",
        "message": "Must be greater than zero."
      }
    ],
    "requestId": "uuid"
  }
}
```

---

# 14.8 HTTP Status Codes

```text
200 OK
201 Created
202 Accepted
204 No Content

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests

500 Internal Server Error
503 Service Unavailable
```

---

# 14.9 Pagination

Default:

```text
page = 1
pageSize = 25
```

Maximum:

```text
pageSize = 100
```

Example:

```http
GET /api/v1/invoices?page=1&pageSize=25
```

---

# 14.10 Invoice API

## List Invoices

```http
GET /api/v1/invoices
```

Filters:

```text
status
workflowState
supplierId
assignedTo
currency
dueBefore
dueAfter
createdBefore
createdAfter
search
page
pageSize
sort
```

Example:

```http
GET /api/v1/invoices?status=PENDING_APPROVAL&page=1&pageSize=25
```

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-1001",
      "supplier": {
        "id": "uuid",
        "name": "ABC Manufacturing"
      },
      "invoiceDate": "2026-08-01",
      "dueDate": "2026-08-31",
      "currency": "INR",
      "totalAmount": "125000.00",
      "status": "PENDING_APPROVAL",
      "workflowState": "WAITING_APPROVAL",
      "aiConfidence": 98.2
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 1,
    "totalPages": 1
  }
}
```

---

# Get Invoice

```http
GET /api/v1/invoices/:invoiceId
```

Response contains:

```text
Invoice

Supplier

PO

Lines

Documents

Validation

Matching

Exceptions

Approval

Payment

Workflow

AI Results
```

---

# Create Invoice

```http
POST /api/v1/invoices
```

Request:

```json
{
  "supplierId": "uuid",
  "invoiceNumber": "INV-1001",
  "invoiceDate": "2026-08-01",
  "dueDate": "2026-08-31",
  "currency": "INR",
  "subtotalAmount": "100000.00",
  "taxAmount": "18000.00",
  "totalAmount": "118000.00",
  "purchaseOrderId": "uuid"
}
```

Response:

```http
201 Created
```

---

# Update Invoice

```http
PATCH /api/v1/invoices/:invoiceId
```

Only editable fields are accepted.

Workflow-controlled fields cannot be directly changed.

---

# Upload Invoice

```http
POST /api/v1/invoices/upload
```

`multipart/form-data`

Fields:

```text
file
source
```

Response:

```json
{
  "data": {
    "invoiceId": "uuid",
    "documentId": "uuid",
    "status": "RECEIVED"
  }
}
```

---

# Start Invoice Processing

```http
POST /api/v1/invoices/:invoiceId/process
```

Response:

```json
{
  "data": {
    "invoiceId": "uuid",
    "status": "PROCESSING"
  }
}
```

Processing runs asynchronously.

---

# 14.11 Invoice Workflow API

## Get Workflow

```http
GET /api/v1/invoices/:invoiceId/workflow
```

Response:

```json
{
  "data": {
    "currentState": "WAITING_APPROVAL",
    "startedAt": "2026-08-08T08:00:00Z",
    "transitions": [
      {
        "from": "RECEIVED",
        "to": "CAPTURED",
        "event": "CaptureCompleted",
        "createdAt": "2026-08-08T08:00:05Z"
      }
    ]
  }
}
```

---

# Get Available Actions

```http
GET /api/v1/invoices/:invoiceId/actions
```

Response:

```json
{
  "data": [
    "APPROVE",
    "REJECT",
    "REQUEST_REVIEW"
  ]
}
```

Available actions are calculated server-side.

---

# Transition Workflow

```http
POST /api/v1/invoices/:invoiceId/transitions
```

Request:

```json
{
  "action": "APPROVE",
  "comment": "Verified against PO."
}
```

Response:

```json
{
  "data": {
    "invoiceId": "uuid",
    "previousState": "WAITING_APPROVAL",
    "newState": "APPROVED"
  }
}
```

The API does not accept arbitrary target states.

Invalid:

```json
{
  "state": "PAID"
}
```

---

# 14.12 Validation API

## Get Validation Results

```http
GET /api/v1/invoices/:invoiceId/validations
```

Response:

```json
{
  "data": [
    {
      "ruleCode": "GST_VALIDATION",
      "status": "PASSED",
      "confidence": 98.5
    },
    {
      "ruleCode": "DUPLICATE_CHECK",
      "status": "PASSED"
    }
  ]
}
```

---

# Run Validation

```http
POST /api/v1/invoices/:invoiceId/validate
```

Response:

```json
{
  "data": {
    "status": "PROCESSING"
  }
}
```

---

# Retry Validation

```http
POST /api/v1/invoices/:invoiceId/validate/retry
```

---

# 14.13 Matching API

## Get Match Results

```http
GET /api/v1/invoices/:invoiceId/matches
```

---

# Run Matching

```http
POST /api/v1/invoices/:invoiceId/match
```

Response:

```json
{
  "data": {
    "status": "MATCHED",
    "confidence": 97.4,
    "purchaseOrderId": "uuid",
    "differenceAmount": "0.00"
  }
}
```

---

# 14.14 Supplier API

## List Suppliers

```http
GET /api/v1/suppliers
```

Filters:

```text
search
status
country
currency
page
pageSize
```

---

# Get Supplier

```http
GET /api/v1/suppliers/:supplierId
```

---

# Create Supplier

```http
POST /api/v1/suppliers
```

Request:

```json
{
  "legalName": "ABC Manufacturing Pvt Ltd",
  "displayName": "ABC Manufacturing",
  "gstNumber": "GSTNUMBER",
  "country": "IN",
  "currency": "INR",
  "paymentTermsDays": 30
}
```

---

# Update Supplier

```http
PATCH /api/v1/suppliers/:supplierId
```

---

# Deactivate Supplier

```http
POST /api/v1/suppliers/:supplierId/deactivate
```

---

# 14.15 Purchase Order API

## List POs

```http
GET /api/v1/purchase-orders
```

---

# Get PO

```http
GET /api/v1/purchase-orders/:poId
```

---

# Get PO Lines

```http
GET /api/v1/purchase-orders/:poId/lines
```

---

# Get Goods Receipts

```http
GET /api/v1/purchase-orders/:poId/goods-receipts
```

---

# 14.16 Exception API

## List Exceptions

```http
GET /api/v1/exceptions
```

Filters:

```text
status
severity
type
assignedTo
invoiceId
```

---

# Get Exception

```http
GET /api/v1/exceptions/:exceptionId
```

---

# Assign Exception

```http
POST /api/v1/exceptions/:exceptionId/assign
```

Request:

```json
{
  "userId": "uuid"
}
```

---

# Resolve Exception

```http
POST /api/v1/exceptions/:exceptionId/resolve
```

Request:

```json
{
  "resolution": "PO confirmed by procurement."
}
```

Response:

```json
{
  "data": {
    "status": "RESOLVED",
    "resolution": "PO confirmed by procurement."
  }
}
```

---

# Reopen Exception

```http
POST /api/v1/exceptions/:exceptionId/reopen
```

---

# 14.17 Approval API

## Get Pending Approvals

```http
GET /api/v1/approvals
```

Filters:

```text
status
invoiceId
approverId
```

---

# Get Approval

```http
GET /api/v1/approvals/:approvalId
```

---

# Approve

```http
POST /api/v1/approvals/:approvalId/approve
```

Request:

```json
{
  "comment": "Approved."
}
```

---

# Reject

```http
POST /api/v1/approvals/:approvalId/reject
```

Request:

```json
{
  "comment": "Amount does not match PO."
}
```

Comment required for rejection.

---

# Delegate

```http
POST /api/v1/approvals/:approvalId/delegate
```

Request:

```json
{
  "userId": "uuid",
  "comment": "Delegating while unavailable."
}
```

---

# 14.18 Payment API

## List Payments

```http
GET /api/v1/payments
```

Filters:

```text
status
supplierId
invoiceId
scheduledDate
currency
```

---

# Get Payment

```http
GET /api/v1/payments/:paymentId
```

---

# Schedule Payment

```http
POST /api/v1/payments
```

Request:

```json
{
  "invoiceId": "uuid",
  "amount": "118000.00",
  "scheduledDate": "2026-08-30",
  "paymentMethod": "BANK_TRANSFER"
}
```

Response:

```json
{
  "data": {
    "id": "uuid",
    "status": "SCHEDULED",
    "amount": "118000.00"
  }
}
```

---

# Put Payment On Hold

```http
POST /api/v1/payments/:paymentId/hold
```

---

# Release Payment

```http
POST /api/v1/payments/:paymentId/release
```

---

# Execute Payment

```http
POST /api/v1/payments/:paymentId/execute
```

This does not directly expose banking credentials.

The Payment Module calls the configured external payment integration.

Response:

```json
{
  "data": {
    "paymentId": "uuid",
    "status": "PROCESSING"
  }
}
```

---

# Retry Failed Payment

```http
POST /api/v1/payments/:paymentId/retry
```

---

# 14.19 Payment Batch API

## List Batches

```http
GET /api/v1/payment-batches
```

---

# Get Batch

```http
GET /api/v1/payment-batches/:batchId
```

---

# Create Batch

```http
POST /api/v1/payment-batches
```

Request:

```json
{
  "paymentIds": [
    "uuid",
    "uuid"
  ],
  "scheduledDate": "2026-08-30"
}
```

---

# Process Batch

```http
POST /api/v1/payment-batches/:batchId/process
```

---

# 14.20 AI API

AI remains advisory.

## Get AI Results

```http
GET /api/v1/invoices/:invoiceId/ai
```

---

# Run AI Analysis

```http
POST /api/v1/invoices/:invoiceId/ai/analyze
```

Response:

```json
{
  "data": {
    "status": "PROCESSING"
  }
}
```

---

# Get AI Recommendation

```http
GET /api/v1/ai-results/:aiResultId
```

Response:

```json
{
  "data": {
    "capability": "VENDOR_MATCH",
    "recommendation": "ABC Manufacturing",
    "confidence": 98.4,
    "explanation": "GST number and supplier identity match.",
    "model": {
      "name": "ap-ai",
      "version": "1.0"
    }
  }
}
```

---

# Submit AI Feedback

```http
POST /api/v1/ai-results/:aiResultId/feedback
```

Request:

```json
{
  "action": "CORRECTED",
  "correctedValue": "ABC Manufacturing Pvt Ltd",
  "comment": "Supplier name confirmed."
}
```

---

# AI Natural Language Search

```http
POST /api/v1/ai/search
```

Request:

```json
{
  "query": "Show unpaid invoices above ₹100,000 due this month."
}
```

Response:

```json
{
  "data": {
    "filters": {
      "status": [
        "APPROVED",
        "SCHEDULED"
      ],
      "minAmount": "100000.00",
      "dueFrom": "2026-08-01",
      "dueTo": "2026-08-31"
    },
    "results": [],
    "confidence": 96.1
  }
}
```

AI generates the query.

Server validates and executes it.

AI never executes arbitrary database queries.

---

# 14.21 Document API

## List Documents

```http
GET /api/v1/invoices/:invoiceId/documents
```

---

# Get Document

```http
GET /api/v1/documents/:documentId
```

Returns metadata.

---

# Get Document Download URL

```http
POST /api/v1/documents/:documentId/access
```

Response:

```json
{
  "data": {
    "url": "temporary-storage-url",
    "expiresIn": 300
  }
}
```

The URL is temporary.

---

# 14.22 Comments API

## Get Comments

```http
GET /api/v1/:entityType/:entityId/comments
```

---

# Add Comment

```http
POST /api/v1/:entityType/:entityId/comments
```

Request:

```json
{
  "body": "Please confirm the PO quantity."
}
```

---

# 14.23 Notifications API

## List Notifications

```http
GET /api/v1/notifications
```

---

# Mark Read

```http
POST /api/v1/notifications/:notificationId/read
```

---

# Mark All Read

```http
POST /api/v1/notifications/read-all
```

---

# 14.24 Audit API

## Get Invoice Audit

```http
GET /api/v1/invoices/:invoiceId/audit
```

---

# Get Entity Audit

```http
GET /api/v1/:entityType/:entityId/audit
```

Only users with audit permission can access audit data.

---

# 14.25 Dashboard API

```http
GET /api/v1/dashboard
```

Response:

```json
{
  "data": {
    "invoicesReceived": 428,
    "pendingApproval": 31,
    "exceptions": 12,
    "scheduledPayments": 48,
    "overdueInvoices": 7,
    "totalOutstanding": "1845000.00",
    "processingAccuracy": 98.2,
    "averageProcessingTime": 18
  }
}
```

---

# 14.26 Reports API

## List Reports

```http
GET /api/v1/reports
```

---

# Generate Report

```http
POST /api/v1/reports
```

Request:

```json
{
  "type": "AP_AGING",
  "filters": {
    "from": "2026-07-01",
    "to": "2026-07-31"
  },
  "format": "CSV"
}
```

Response:

```json
{
  "data": {
    "jobId": "uuid",
    "status": "PROCESSING"
  }
}
```

---

# Get Report Job

```http
GET /api/v1/reports/jobs/:jobId
```

---

# 14.27 Integration API

## List Integrations

```http
GET /api/v1/integrations
```

---

# Create Integration

```http
POST /api/v1/integrations
```

Request:

```json
{
  "type": "ERP",
  "provider": "ERP_PROVIDER"
}
```

---

# Test Integration

```http
POST /api/v1/integrations/:integrationId/test
```

---

# Sync Integration

```http
POST /api/v1/integrations/:integrationId/sync
```

---

# Get Sync Jobs

```http
GET /api/v1/integrations/:integrationId/sync-jobs
```

---

# 14.28 Settings API

## Get Settings

```http
GET /api/v1/settings
```

---

# Update Setting

```http
PATCH /api/v1/settings/:settingKey
```

Request:

```json
{
  "value": true
}
```

---

# 14.29 Approval Rule API

## List Rules

```http
GET /api/v1/approval-rules
```

---

# Create Rule

```http
POST /api/v1/approval-rules
```

Request:

```json
{
  "name": "High Value Approval",
  "minAmount": "100000.00",
  "approvalType": "SEQUENTIAL",
  "sequenceNumber": 1,
  "approverRoleId": "uuid"
}
```

---

# Update Rule

```http
PATCH /api/v1/approval-rules/:ruleId
```

---

# Deactivate Rule

```http
POST /api/v1/approval-rules/:ruleId/deactivate
```

---

# 14.30 User API

## List Users

```http
GET /api/v1/users
```

---

# Get User

```http
GET /api/v1/users/:userId
```

---

# Create User

```http
POST /api/v1/users
```

---

# Update User

```http
PATCH /api/v1/users/:userId
```

---

# Deactivate User

```http
POST /api/v1/users/:userId/deactivate
```

---

# 14.31 API Idempotency

Financial mutation requests support:

```http
Idempotency-Key: <unique-key>
```

Required for:

```text
Payment Creation

Payment Execution

Payment Retry

Batch Processing

ERP Sync
```

If the same request is submitted twice:

```text
First Request
      │
      ▼
Process
      │
      ▼
Store Result

Second Request
      │
      ▼
Return Stored Result
```

No duplicate payment.

---

# 14.32 Concurrency

Workflow mutations include a version.

Example:

```json
{
  "action": "APPROVE",
  "version": 7
}
```

If the server version has changed:

```http
409 Conflict
```

Response:

```json
{
  "error": {
    "code": "STALE_RESOURCE",
    "message": "This invoice was changed by another user."
  }
}
```

---

# 14.33 Authorization

Every protected endpoint checks:

```text
Authentication

↓

Organization

↓

Permission

↓

Resource Ownership

↓

Business Rule
```

Example:

```text
POST /payments/:id/execute
```

requires:

```text
Authenticated User

+

Correct Organization

+

payment.execute

+

Payment is eligible

+

Approval completed
```

---

# 14.34 Workflow Protection

The API never allows:

```http
PATCH /invoices/:id
```

to directly modify:

```text
workflowState
status
approvalStatus
paymentStatus
```

These are changed only through workflow operations.

---

# 14.35 Async Operations

Long-running operations return:

```http
202 Accepted
```

Examples:

```text
OCR

AI Analysis

ERP Sync

Report Generation

Large File Processing
```

Response:

```json
{
  "data": {
    "jobId": "uuid",
    "status": "PROCESSING"
  }
}
```

---

# 14.36 Job Status

```http
GET /api/v1/jobs/:jobId
```

Response:

```json
{
  "data": {
    "id": "uuid",
    "status": "COMPLETED",
    "progress": 100,
    "result": {
      "invoiceId": "uuid"
    }
  }
}
```

Statuses:

```text
QUEUED
PROCESSING
COMPLETED
FAILED
CANCELLED
```

---

# 14.37 Rate Limits

V1 defaults:

```text
Authenticated API

100 requests / minute / user
```

Sensitive operations:

```text
Payment

20 requests / minute
```

Authentication:

```text
10 attempts / minute / IP
```

Limits may be adjusted by deployment configuration.

---

# 14.38 API Versioning

Current:

```text
/v1
```

Breaking changes require:

```text
/v2
```

Do not silently change existing contracts.

---

# 14.39 Webhooks

V1 supports outbound webhooks for important events.

Events:

```text
invoice.created

invoice.approved

invoice.rejected

payment.scheduled

payment.completed

payment.failed

invoice.archived

exception.created

exception.resolved
```

Example payload:

```json
{
  "id": "event-uuid",
  "type": "payment.completed",
  "timestamp": "2026-08-08T10:00:00Z",
  "organizationId": "uuid",
  "data": {
    "paymentId": "uuid",
    "invoiceId": "uuid",
    "amount": "118000.00"
  }
}
```

Webhook delivery:

```text
Retry

↓

Exponential Backoff

↓

Maximum Attempts

↓

Failure Logged
```

---

# 14.40 API Contract Rules

Every endpoint must define:

```text
Method

Path

Authentication

Permission

Request

Response

Errors

Side Effects
```

No undocumented endpoint should be consumed by the frontend.

---

# 14.41 Critical API Flow

## Invoice Processing

```text
POST /invoices/upload
        │
        ▼
POST /invoices/:id/process
        │
        ▼
OCR
        │
        ▼
AI Extraction
        │
        ▼
POST /invoices/:id/validate
        │
        ▼
POST /invoices/:id/match
        │
        ▼
Workflow Engine
        │
        ├── Exception
        │
        └── Approval
```

---

# 14.42 Approval Flow

```text
GET /approvals
        │
        ▼
GET /approvals/:id
        │
        ▼
POST /approvals/:id/approve
        │
        ▼
Workflow Engine
        │
        ▼
Payment Eligible
```

---

# 14.43 Payment Flow

```text
POST /payments
        │
        ▼
Scheduled
        │
        ▼
POST /payments/:id/execute
        │
        ▼
External Payment Provider
        │
        ├── Success → PAID
        │
        └── Failure → FAILED
```

---

# 14.44 ERP Flow

```text
POST /integrations/:id/sync
        │
        ▼
Sync Job
        │
        ▼
ERP Connector
        │
        ▼
Database
        │
        ▼
Audit
```

---

# 14.45 API Security Rules

Never expose:

```text
Password Hashes

API Token Hashes

Encryption Keys

Payment Credentials

Integration Secrets

Internal AI Prompts

Database Credentials
```

Never accept:

```text
organizationId
```

from the client as authority.

The server obtains organization context from the authenticated session.

---

# 14.46 Locked Decisions

✓ REST API.

✓ `/api/v1` versioning.

✓ JSON responses.

✓ Server-side validation.

✓ Server-side authorization.

✓ Server owns workflow state.

✓ Frontend cannot directly modify workflow state.

✓ Standard response format.

✓ Standard error format.

✓ Pagination for collections.

✓ Server-side filtering.

✓ Idempotency for financial operations.

✓ Optimistic concurrency for workflow operations.

✓ Async jobs for long-running tasks.

✓ Outbound webhooks for important events.

✓ HTTPS only.

✓ No GraphQL in V1.

✓ No WebSocket dependency in V1.

✓ No direct database access from frontend.

✓ No direct AI-provider access from frontend.

✓ No direct ERP access from frontend.

✓ No arbitrary AI-generated database queries.

✓ Payment execution requires server-side authorization.

✓ API contracts remain backward-compatible within a version.
