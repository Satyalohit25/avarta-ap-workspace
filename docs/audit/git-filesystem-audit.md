# Git vs Filesystem & Ignored Paths Comprehensive Audit

## Date: 2026-10-22 (Day 1.5 - Item 8 Audit)

### 1. Executive Summary
A comprehensive audit comparing `git ls-files` against the working filesystem was performed to verify repository tracking hygiene, ensure no required source code is untracked or accidentally ignored, and inspect all paths excluded by `.gitignore`.

### 2. Resolution of Previous Findings
- **`src/modules/audit`:** Fully tracked in git:
  - `apps/api/src/modules/audit/audit-rbac.test.ts`
  - `apps/api/src/modules/audit/audit.test.ts`
  - `apps/api/src/modules/audit/controller.ts`
  - `apps/api/src/modules/audit/repository.ts`
  - `apps/api/src/modules/audit/routes.ts`
  - `apps/api/src/modules/audit/service.ts`
- **`docs/audit/`:** Previously matched by an overly broad `.gitignore` rule (`docs/audit/` and `/audit/`). The `.gitignore` file has been updated to remove these exclusions, allowing `docs/audit/app-walkthrough.md` to be tracked.

### 3. Full Inventory of Ignored Paths (`git status --ignored -s`)
Every entry matched by `.gitignore` was inspected for source code:
1. `.env`, `apps/api/.env`, `apps/web/.env` — Local environment secret definitions (contains secrets, intentionally uncommitted).
2. `apps/api/dist/`, `apps/web/dist/` — Compiled production artifacts (`tsc` output and Vite production bundle).
3. `node_modules/`, `apps/api/node_modules/`, `apps/web/node_modules/` — Third-party dependency trees managed by `pnpm`.
4. `apps/api/uploads/`, `uploads/` — Local runtime document storage for simulated OCR uploads (contains binary PDFs/images).
5. `test-results/`, `apps/web/test-results/`, `apps/web/playwright-report/` — Playwright test execution traces, snapshots, and HTML report output.
6. `apps/web/e2e-screenshots/`, `apps/web/pm-audit-output/` — Playwright automated visual regression screenshots and PM review artifacts.
7. `apps/web/tsconfig.tsbuildinfo` — TypeScript incremental build cache.

**Conclusion:** None of the ignored paths contain source code or uncommitted application logic.

### 4. Git Status Verification
After untracking removal, running `git status -s` confirms that every project source file across backend, frontend, database schemas, migrations, test suites, and documentation is tracked by git.
