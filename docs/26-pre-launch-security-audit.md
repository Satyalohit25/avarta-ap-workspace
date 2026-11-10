# Pre-Launch Security Audit — 27-Point Verification

**Scope:** `apps/api`, `apps/web`, dependency tree, and operational defaults.
**Date:** 2026-11-10
**Verdict:** Ship-ready with two documented residual risks (see §4). No
critical or high-severity issue remains open.

Every point below was verified against the code, not against intent. Where a
defect was found it was fixed in this pass; the remediation column names the
change and the regression test.

---

## 1. Authentication & Session Management

| # | Point | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin routes enforce authorization | **Pass** | Every non-public module route enforces `requireAuth`. The only unauthenticated endpoints are `/auth/config`, `/auth/signup|register|login|refresh`, `/billing/plans`, `/billing/webhook` (HMAC-verified), and `/public/*` (tracking token / HMAC). Credential and tenant mutations add role checks: API-key management is `ADMINISTRATOR`-only (`api_keys/routes.ts:11`), integrations are `ADMINISTRATOR`-only (`integrations/routes.ts`), payments and billing upgrades require `ADMINISTRATOR|FINANCE_MANAGER`, and `PATCH /organization/settings` requires `ADMINISTRATOR`. API keys are blocked from `/auth`, `/billing`, `/settings`, `/integrations`, `/organization`, `/api-keys`, `/demo`, `/notifications/preferences`, `/data-export` (`middleware/auth.ts:10-26`). Demo reset is denied in production (`modules/demo/routes.ts:9-17`). |
| 2 | No hardcoded API keys or environment tokens | **Pass** | Full scan for `sk_live_`, `AKIA`, `AIza`, private-key blocks, `ghp_`, `glpat-`, `xox*` found only test fixtures (`prerelease-security.test.ts:40`, `crypto.test.ts:6`) and UI label text (`PaymentGatewayConfigCard.tsx:62`). `git ls-files` returns only `.env.example` files. |
| 3 | Strong password hashing | **Pass** | `bcryptjs` cost 10 for every password path (`auth/service.ts`, `demo-seeder.ts`). Login performs a dummy hash comparison when the user does not exist to keep timing uniform (`auth/service.ts:171`). Minimum password length is 12 (`auth/validation.ts:11`). No MD5/SHA-1 password hashing. SHA-256 is used only for opaque token hashing, which is correct. |
| 4 | `.env` and secrets excluded from Git | **Pass** | `.gitignore:9-11` covers `.env`, `.env.local`, `.env.production`, `*.local`. `git ls-files` shows no tracked secret material. |
| 5 | Session expiration and revocation | **Pass** | Access JWT lifetime defaults to 900s (`config/env.ts`), refresh token 7 days (`lib/refresh-cookie.ts:5`). Logout and password reset revoke refresh tokens and bump `tokenVersion`. Revocation checks now **fail closed** if the database is unreachable (`lib/jwt.ts:94-114`). |
| 6 | Secure cookie directives | **Pass** | Refresh cookie is `HttpOnly; Path=/api; SameSite=Strict` with `Secure` in production and `Max-Age=604800` (`lib/refresh-cookie.ts:7-18`). Access tokens are never stored in cookies. |
| 7 | IDOR / broken object-level authorization | **Pass** | `organizationId` is always derived from the verified token (`middleware/auth.ts:32-34`), never from a request body. Repositories use tenant-scoped compound keys; Prisma `P2025` is mapped to a generic 404 to prevent tenant enumeration (`middleware/error-handler.ts`). The tenant guard rejects unscoped queries (`config/tenant-guard.ts`). |

## 2. Injection & Data Neutralization

| # | Point | Status | Evidence |
|---|-------|--------|----------|
| 8 | SQL injection | **Pass** | Raw SQL is limited to parameterized `$1/$2` calls with `FOR UPDATE` locks (`exceptions/service.ts:136`, `approvals/service.ts:202,268`, `payments/service.ts:113`) or static statements (`tenant-db-manager.ts:106`, `app.ts:49`). No user input is interpolated into SQL. |
| 9 | Cross-site scripting | **Pass** | No `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, or `insertAdjacentHTML` anywhere in `apps/web`. React escapes all rendered data. The API now sends `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` (`app/app.ts`). |
| 10 | CSRF | **Pass** | Mutating routes authenticate with a bearer token in the `Authorization` header, not an ambient cookie. The only cookie-authenticated mutation is `/auth/refresh`, protected by `SameSite=Strict`. No CSRF token is required because there is no cookie-authenticated state change. |
| 11 | OS command injection | **Pass** | No runtime `exec`/`spawn`. `execSync` appears only in developer/test scripts with static command strings (`scripts/reconcile-tests.ts`, `bundle-hygiene.test.ts`). |
| 12 | Path traversal | **Pass** | Document reads use `path.basename(storageKey)` plus a `startsWith(uploadsDir)` check (`invoices/controller.ts:106-111`). Upload keys are server-generated. Email attachments use `path.basename(fileName)` (`public/email-webhook.ts:140`). |
| 13 | Unrestricted file upload | **Pass** | Multer enforces a MIME allowlist (PDF/PNG/JPG), an extension allowlist, and a 10 MB cap; stored names are randomized and the extension is normalized (`lib/upload.ts:10-46`). Inbound email attachments repeat the MIME and size checks (`email-webhook.ts:111-130`). |
| 14 | Insecure deserialization | **Pass** | No `pickle`, unsafe YAML, or dynamic object reconstruction. `JSON.parse` is applied only to bounded request bodies and the preprocessed invoice `lines` field. |

## 3. Network & Transport

| # | Point | Status | Evidence |
|---|-------|--------|----------|
| 15 | CORS over-permissiveness | **Pass** | Exact-origin matching, `null` rejected, wildcard ignored in production, credentials enabled only with an explicit origin (`security/cors.ts`). Live probes confirm hostile origins receive no allow header (11/11 pass). |
| 16 | HTTPS enforcement | **Pass (deployment-dependent)** | HSTS is emitted in production with `max-age=31536000; includeSubDomains; preload`. TLS itself terminates at the operator's proxy/load balancer; the runbook requires an HTTP→HTTPS redirect at that edge. |
| 17 | Rate limiting | **Pass (single-instance scope)** | Auth 15/min, general API 300/min, public tracking 30/min (`middleware/rate-limiter.ts`). `X-Forwarded-For` is honoured only when `TRUST_PROXY=true`. The limiter is in-process; multi-instance deployments must front it with a shared limiter (documented residual risk). |
| 18 | SSRF | **Pass** | BYODB and Tally gateway URLs are validated with DNS resolution; loopback, link-local/metadata (`169.254.169.254`), and RFC 1918 ranges are rejected unless the explicit local-dev override is set (`security/ssrf.ts`, `lib/tenant-db-manager.ts`). Live probes pass. |
| 19 | Security headers | **Pass (fixed)** | Added `Content-Security-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `X-Permitted-Cross-Domain-Policies`, and `app.disable("x-powered-by")` alongside the existing `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS (`app/app.ts`). Regression test added. |

## 4. Operations & Logic

| # | Point | Status | Evidence |
|---|-------|--------|----------|
| 20 | Commented-out code / leftover dev secrets | **Pass** | No credentials in comments. The demo seeder uses `password123`, but `seed.ts` and `seedDemoDataset()` both hard-exit in production (`prisma/seed.ts:4-7`, `lib/demo-seeder.ts:28-31`), and the reset route is production-disabled. |
| 21 | Verbose error messages | **Pass (fixed)** | Unexpected errors return a generic 500 with a request id, never a stack trace (`middleware/error-handler.ts`). Prisma `P2025` maps to 404. The inbound email webhook no longer echoes `err.message` to the caller. Oversized and malformed JSON now return 413/400 instead of 500. |
| 22 | Outdated dependencies | **Pass (remediated)** | `pnpm audit --prod` went from **32 advisories (1 critical, 7 high)** to **2 moderate, 0 high, 0 critical**. Upgraded `nodemailer` 6→10, `uuid` 9→11, `zod` 3→4, `react-router-dom` 6.30.4→6.30.6, and pinned patched transitive `body-parser`, `qs`, and `proxy-addr` in `pnpm-workspace.yaml`. |
| 23 | Insufficient audit logging | **Pass** | Audit rows are written for login/logout/reset/invite, workflow transitions, approvals, payments, invoice changes, organization settings, API-key create/revoke, notifications, and exports (`lib/audit.ts`, call sites across modules). Payloads contain identifiers and business data only — no passwords, raw tokens, or secrets. Audit rows are append-only. |
| 24 | Insecure fallback / default parameters | **Pass** | `validateEnvironment()` fails closed on an unset/invalid `NODE_ENV`, requires `JWT_SECRET`, `APP_ENCRYPTION_KEY`, `WEB_ORIGIN`, and `DIRECT_URL` in production, and rejects `MASTER_DEV_*` there (`config/env.ts`). Public signup is fail-closed unless explicitly enabled. Demo seeding is production-blocked. |
| 25 | Race conditions on financial mutations | **Pass** | Approvals and exceptions take `SELECT … FOR UPDATE` row locks inside transactions (`approvals/service.ts:202,268`, `exceptions/service.ts:136`). Payment execution locks the payment row, re-checks status, and claims it before calling the gateway (`payments/service.ts:112-160`). All financial mutations require an idempotency key (`middleware/idempotency.ts`, `payments/routes.ts`). Compound unique constraints back this at the database level. |
| 26 | Memory allocation safety | **Pass (hardened)** | File uploads capped at 10 MB; JSON bodies reduced from 10 MB to **1 MB** (`app/app.ts`); body-parser `entity.too.large` returns 413. Zod upgraded to 4.6.6, which patches the oversized-collection memory advisory. Email attachment base64 is decoded and size-checked before writing. No unbounded stream buffering in request handlers. |
| 27 | Broken logic flow / unvalidated redirects | **Pass** | `sanitizeReturnTo` rejects protocol-relative URLs, backslashes, control characters, encoded traversal, and scheme tricks (`web/src/lib/sanitizeReturnTo.ts`). Login is the only redirect sink and uses it. The Workflow Engine remains the sole writer of `workflow_instances.current_state` and `invoices.status`; role checks guard every transition route. |

---

## Findings fixed in this pass

1. **Token leakage via query string** — `requireAuth` accepted `?token=`. Removed. The invoice document preview now fetches bytes with a bearer token and renders a blob URL (`DocumentSourceCard.tsx`). Regression test asserts query tokens return 401.
2. **Missing security headers** — added CSP, COOP, CORP, cross-domain policy, and disabled `x-powered-by`.
3. **Oversized JSON bodies** — reduced to 1 MB and mapped to HTTP 413; malformed JSON mapped to 400.
4. **Fail-open revocation check** — database errors during revocation lookup now deny access.
5. **Email webhook tenant trust and error leakage** — the production path no longer honours `organizationId` from the webhook body, and internal error text is no longer returned.
6. **Vulnerable dependencies** — upgraded/pinned as described in point 22.

Verification after the changes: `pnpm typecheck` clean, `pnpm lint` 0 errors
(73 pre-existing warnings), `pnpm test` **344 passing / 51 suites**, and
`pnpm --filter @ap-saas/api probe:security` **11/11 passing**.

## Residual risks (accepted, documented)

1. **React Router 6.x — 2 moderate advisories** (`GHSA-wrjc-x8rr-h8h6`,
   `GHSA-337j-9hxr-rhxg`). Both require React Router 7.18 for a fix. This app
   is a client-only SPA: it does not use SSR hydration/`deserializeErrors`,
   and every redirect target passes through `sanitizeReturnTo`, which already
   rejects the backslash vectors. Revisit when the React Router 7 migration is
   scheduled.
2. **In-memory rate limiter** — enforcement is per process. A horizontally
   scaled deployment must add a shared limiter (Redis or edge/WAF) or sticky
   routing.
3. **TLS termination** — HSTS is emitted by the app, but HTTPS and the
   HTTP→HTTPS redirect must be configured at the reverse proxy/CDN.
4. **Product limitations out of audit scope** — BYODB record routing during
   onboarding, live ERP OAuth, payout simulation, and billing checkout are
   documented in `docs/25-user-acceptance-test-plan.md` and `README.md`.
