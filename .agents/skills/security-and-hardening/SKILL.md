---
name: security-and-hardening
description: >-
  Enterprise application security, OWASP Top 10 prevention, multi-tenant IDOR protection,
  idempotency keys, input validation, and secure auth practices for Avarta AP Workspace.
  Activate when implementing or reviewing authentication, authorization, API endpoints,
  financial transactions, data models, or external integrations.
---

# Security & Application Hardening (Avarta AP Workspace)

Production security standard for enterprise financial software handling accounts payable, banking rails, vendor data, and multi-tenant organizations.

---

## 1. Threat Modeling First (STRIDE Framework)

Before writing or modifying any route, service, or data model, trace the data boundary:

1. **Map Trust Boundaries**:
   * Untrusted inputs cross into the system via HTTP request bodies, query params, file uploads (`multer`), webhooks, and OCR/AI extractions.
   * **Rule**: AI extraction outputs and client requests have zero inherent trust. Validate every field before committing to database or workflow state.
2. **Name the Critical Assets**:
   * Tenant isolation (`organization_id`), vendor bank account numbers/IFSC/IBAN, invoice amounts, payment approval thresholds, JWT signing secrets, password hashes.
3. **STRIDE Analysis at a Glance**:
   * **S (Spoofing)**: Enforce JWT verification and user session binding.
   * **T (Tampering)**: Parameterize all Prisma queries; verify file MIME types and payload hashes.
   * **R (Repudiation)**: Write immutable `AuditLog` records for every workflow transition and financial execution.
   * **I (Information Disclosure)**: Strip `passwordHash`, internal IDs, and other tenant data before HTTP response serialization.
   * **D (Denial of Service)**: Rate-limit authentication routes and cap multipart file upload sizes (max 10MB).
   * **E (Elevation of Privilege)**: RBAC middleware (`requireRole`) on all administrative and payment endpoints.

---

## 2. The Three-Tier Boundary System

### Tier 1: Always Do (Non-Negotiable)
* **Strict Tenant Isolation**: Every Prisma query for business entities MUST include `where: { organization_id }`.
* **Session-Derived Organization**: Extract `organization_id` strictly from verified JWT credentials (`req.user.organizationId`). Never trust an `organizationId` passed in `req.body`, `req.params`, or `req.query`.
* **Boundary Validation**: Validate all incoming request payloads with Zod schemas in `validation.ts` before delegating to `service.ts`.
* **Financial Idempotency**: Require and verify the `Idempotency-Key` header on all payment creation, execution, retry, and ERP sync endpoints.
* **Password Hashing**: Use `bcryptjs` with a minimum work factor of 12 rounds. Never store or log plaintext passwords.
* **Parameterized Queries**: Always rely on Prisma's type-safe client. Never concatenate raw strings into `$queryRaw` or `$executeRaw`.
* **Output Sanitization**: Transform internal Prisma records through `mapper.ts` to strip sensitive credentials before client response.

### Tier 2: Ask First (Requires Explicit Confirmation)
* Modifying payment execution rails or third-party bank webhook endpoints.
* Altering the 5 canonical roles (`Administrator`, `Finance Manager`, `Finance Executive`, `Approver`, `Read Only`) or role permission hierarchies.
* Updating JWT secret configuration or token lifespan settings.
* Adding unauthenticated or public routes outside `/api/v1/public/`.

### Tier 3: Never Do (Strict Anti-Patterns)
* **NEVER trust client-provided tenant IDs** (Anti-IDOR protection).
* **NEVER implement optimistic UI** on financial operations (Approvals, Scheduled Payments, Disbursements, ERP Sync).
* **NEVER use hard deletes** (`prisma.invoice.delete`). Entities must be marked `ARCHIVED`, `REJECTED`, or `DEACTIVATED`.
* **NEVER store sensitive auth tokens or banking data** in unencrypted browser `localStorage` or component state.
* **NEVER leak database stack traces** or internal SQL errors in client responses. Return generic, structured error envelopes.

---

## 3. Financial Invariant Safeguards

1. **Line-Item 3-Way Match Invariant**:
   * 3-Way matching must compare individual line SKUs, unit prices, and quantities against Purchase Order lines and Goods Receipts.
   * Never match based on aggregate invoice totals alone.
2. **Multi-Currency Grouping**:
   * Never sum monetary amounts across distinct currency codes (`INR`, `USD`, `EUR`) without verified FX conversion rates.
3. **Idempotency Key Reuse Protection**:
   * If an idempotency key matches an ongoing execution, reject concurrent requests with `409 Conflict`.
   * If an idempotency key matches a completed operation, return the cached result payload without re-executing payment side-effects.
