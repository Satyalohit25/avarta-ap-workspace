# Audit Coverage Matrix

Status Legend:
- `not-tested`: Planned for evaluation.
- `pass`: Validated with evidence.
- `issue`: Defect or gap found and logged in `findings.json`.
- `blocked`: Cannot test due to dependency or environment.

| Page / Route | Flow Priority | A. Resp Layout | B. Look & Feel | C. UX & Flows | D. Perf (CWV) | E. Reliability | F. A11y (AA) | G. Security | H. SEO | I. Memory | J. Privacy | K. i18n/Data | L. Device | M. AP-Specific | Last Tested | Evidence Path |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/login` | High (P0) | pass | pass | pass | pass | pass | pass | pass | pass | not-tested | pass | not-tested | not-tested | pass | 2026-10-14 | `audit/screenshots/login_prod_clean.png` |
| `/overview` | Critical (P0) | pass | pass | pass | not-tested | pass | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | pass | 2026-10-14 | `audit/screenshots/overview_verified.png` |
| `/inbox` | Critical (P0) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/invoices` | Critical (P0) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/invoices/:id` | Critical (P0) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/exceptions` | Critical (P0) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/approvals` | High (P0) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/payments` | High (P0) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/suppliers` | Medium (P1) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/purchase-orders` | Medium (P1) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/reports` | Medium (P1) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/archive` | Low (P2) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/settings` | High (P1) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/notifications` | Low (P2) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/profile` | Medium (P2) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| `/track/:token` | High (P1) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
| Public Legal Pages | Low (P3) | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | not-tested | — | — |
