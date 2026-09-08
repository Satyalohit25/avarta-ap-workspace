---
name: playwright
description: >-
  Playwright agent automation and testing skill for browser control, end-to-end test execution,
  test generation, and locator healing. Activate when writing, updating, healing, or running
  Playwright E2E tests, auditing DOM accessibility, or executing token-efficient browser automation.
---

# Playwright Agent & Testing Skill

This skill provides coding agents with structured workflows and guidelines for browser automation, test authoring, test healing, and accessibility validation using Playwright and the `@playwright/test` test runner.

---

## 1. Quick Reference: Playwright in ClearOps AP Workspace

In this workspace, the Playwright E2E test suite lives in `apps/web/e2e/`.

```bash
# Run all E2E tests
cd apps/web && npx playwright test

# Run a specific test file
cd apps/web && npx playwright test e2e/invoices.spec.ts

# Run with visual UI mode
cd apps/web && npx playwright test --ui

# View HTML test execution report
cd apps/web && npx playwright show-report
```

---

## 2. Test Architecture & Seeded Auth Helpers

### Seeded Test Accounts (`e2e/helpers/auth.ts`)
The application is pre-seeded with 4 standard personas (all passwords: `password123`):
* `SEEDED_ACCOUNTS.manager` (`manager@clearops.dev`) — Finance Manager (Default)
* `SEEDED_ACCOUNTS.admin` (`admin@clearops.dev`) — Administrator
* `SEEDED_ACCOUNTS.executive` (`executive@clearops.dev`) — Finance Executive
* `SEEDED_ACCOUNTS.approver` (`approver@clearops.dev`) — Approver

### Standard Authentication Pattern in Specs
```typescript
import { test, expect } from "@playwright/test";
import { loginAs, SEEDED_ACCOUNTS } from "./helpers/auth";

test.describe("Invoice Ingestion & Processing", () => {
  test.beforeEach(async ({ page }) => {
    // Automatically logs in as Finance Manager and verifies /overview navigation
    await loginAs(page, SEEDED_ACCOUNTS.manager);
  });

  test("submits invoice and verifies split preview", async ({ page }) => {
    await page.goto("/inbox");
    await page.fill("#inbox-invoice-number", "INV-2026-9999");
    await page.fill("#inbox-amount", "45000.00");
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);
    await expect(page.locator("h1")).toContainText("INV-2026-9999");
  });
});
```

---

## 3. Best Practices & Token-Efficient Test Design

1. **Role-First Locators:** Prioritize accessible user-facing locators:
   * `page.getByRole('button', { name: 'Run Capture' })`
   * `page.getByLabel('Invoice Number')`
   * `page.getByPlaceholder('e.g. INV-2026-1010')`
2. **Avoid Strict Mode Ambiguity:** When multiple headers or cards exist on a screen, scope locators cleanly:
   * `page.locator("header").first()` (Top navigation bar)
   * `page.locator("header").nth(1)` or `page.locator("main header")` (Page header)
3. **Accessibility Audits (WCAG 2.2 AA):** All interactive elements must maintain:
   * Explicit `aria-label` or visible label bindings (`htmlFor` matching input `id`).
   * Color-contrast pairing (icons/text must not rely on color alone).

---

## 4. Test Healing & Generator Agent Lifecycle

When UI components undergo structural refactoring (e.g. adjusting column grids, renaming status copy):
1. **Identify the affected locator** from the failure stack trace in `test-results/`.
2. **Inspect the rendered component markup** (e.g. checking `PageHeader.tsx` or input `id` attributes).
3. **Update locators to use robust accessibility or ID selectors** rather than brittle CSS hierarchy paths.
4. **Re-run the targeted spec** before running the full suite to verify resolution.
