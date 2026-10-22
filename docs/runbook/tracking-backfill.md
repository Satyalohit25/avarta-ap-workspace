# Runbook: Public Tracking Expiration Backfill and Recomputation

## Background & Scope
During Day 1 backfill operations, 35 legacy invoices were backfilled with tracking tokens that received 30-day (standard) and 90-day (PAID) retention windows.
Under the canonical Day 1.5 retention policy:
- **Standard Invoices:** 90 days retention from creation/backfill.
- **Paid Invoices:** 270 days retention (90 days base + 180 days extended retention for remittance/audit).

## Verification of Environment & Isolation
- **Environment Tested:** Local development and isolated test database (`schema=test_suite`).
- **Confirmation:** Confirmed that **NO staging or production databases were touched**.
- **Guard Enforcement:** All migrations and backfill scripts are guarded by `DATABASE_URL` check ensuring execution only targets the local development/test PostgreSQL instance.

## Script & Idempotency Specification
Module: `apps/api/src/modules/invoices/backfill-tracking.ts`
Function: `backfillInvoiceTrackingTokens()`

### Execution Logic:
1. **Backfill Step:** Identifies all invoices where `trackingTokenHash IS NULL`. For each, generates a cryptographically secure 256-bit entropy token, HMAC-SHA256 hash, and AES-256-GCM encrypted token. Sets `trackingTokenExpiresAt` to `now + 90 days` (or `now + 270 days` if `status === 'PAID'`).
2. **Recomputation Step:** Identifies all existing invoices where `trackingTokenHash IS NOT NULL`. Checks if their expiration is below the target policy threshold:
   - For `PAID` invoices: threshold `now + 250 days`, updates to `now + 270 days`.
   - For other invoices: threshold `now + 75 days`, updates to `now + 90 days`.
3. **Idempotency Guarantee:**
   - On the first run, existing rows with old 30d/90d expiries are upgraded to 90d/270d.
   - On subsequent runs, all expiries meet or exceed the threshold buffer, yielding `recomputed: 0` and `created: 0`.

## Automated Test Coverage
Verified by `apps/api/src/modules/invoices/backfill-tracking.test.ts`:
- Verified that null tokens receive 90-day expiry.
- Verified that existing 30d tokens are recomputed to 90-day expiry.
- Verified that existing 90d PAID tokens are recomputed to 270-day expiry.
- Verified that running the procedure a second time results in 0 updates (strict idempotency).
