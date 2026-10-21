---
name: playwright
description: >-
  Playwright agent automation, resilient E2E testing, web-first assertions, and accessibility validation for Avarta AP Workspace.
  Activate when writing, updating, healing, or running Playwright E2E tests, auditing DOM accessibility,
  or executing headless browser verification.
---

# Playwright Testing & Verification Craft (Avarta AP Workspace)

High-velocity standard for authoring resilient, flakiness-free, and token-efficient E2E tests in `apps/web/e2e/`.

---

## 1. Quick Execution Reference

Run tests headlessly via the CLI to maximize execution velocity and eliminate sub-process latency:

```bash
# Run all E2E tests
pnpm --filter @ap-saas/web test:e2e

# Run a specific spec
cd apps/web && npx playwright test e2e/invoices.spec.ts

# Run a single test with debug trace
cd apps/web && npx playwright test e2e/invoices.spec.ts -g "submits invoice" --trace on

# Run in UI mode
cd apps/web && npx playwright test --ui
```

---

## 2. Seeded Personas & Authentication Patterns

The database is pre-seeded with 5 standard test personas (password: `password123` for all):
* `SEEDED_ACCOUNTS.manager` (`manager@avarta.dev`) — Finance Manager (Default triage & batch approval)
* `SEEDED_ACCOUNTS.admin` (`admin@avarta.dev`) — Administrator (Settings, user management)
* `SEEDED_ACCOUNTS.executive` (`executive@avarta.dev`) — Finance Executive (Daily invoice intake & capture)
* `SEEDED_ACCOUNTS.approver` (`approver@avarta.dev`) — Approver (PO & invoice threshold sign-off)
* `SEEDED_ACCOUNTS.readonly` (`readonly@avarta.dev`) — Read Only (Auditing, analytics inspection)

### Standard Auth & Navigation Pattern
```typescript
import { test, expect } from "@playwright/test";
import { loginAs, SEEDED_ACCOUNTS } from "./helpers/auth";

test.describe("Invoice Workbench Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticates as Finance Manager and asserts navigation to /overview
    await loginAs(page, SEEDED_ACCOUNTS.manager);
  });

  test("filters invoices and verifies split preview", async ({ page }) => {
    await page.goto("/invoices");

    // Web-first assertion: auto-retrying, non-flaky
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();

    // Fill filter chips
    await page.getByPlaceholder("Search by invoice # or vendor...").fill("INV-2026-0101");
    await page.getByRole("row", { name: /INV-2026-0101/i }).click();

    // Verify split preview drawer
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Extraction Confidence")).toBeVisible();
  });
});
```

---

## 3. Resilient Locator Strategy & Flakiness Elimination

1. **Role-First Accessibility Locators (Preferred)**:
   * Buttons: `page.getByRole("button", { name: "Approve Invoice" })`
   * Form inputs: `page.getByLabel("Invoice Number")` or `page.getByPlaceholder("e.g. INV-2026-1010")`
   * Headings: `page.getByRole("heading", { name: "Exceptions Queue", level: 1 })`
   * Tab controls: `page.getByRole("tab", { name: "Audit Timeline" })`
2. **Never Use Brittle CSS Hierarchies**:
   * *Anti-Pattern*: `page.locator("div > div.flex > div:nth-child(2) > button")` (breaks upon slightest layout tweak).
   * *Correct*: `page.getByRole("button", { name: "Schedule Payment" })` or `page.locator("#schedule-payment-cta")`.
3. **Web-First Assertions Over Arbitrary Sleep**:
   * *Anti-Pattern*: `await page.waitForTimeout(2000)` (slows test suite, introduces race conditions).
   * *Correct*: `await expect(page.getByText("Invoice Approved")).toBeVisible({ timeout: 5000 })`.
4. **Scope Ambiguous Matchers**:
   * When top-nav and page headers collide: `page.locator("main header").getByRole("heading")`.

---

## 4. Accessibility Testing Standard (WCAG 2.2 AA)

Inject `@axe-core/playwright` to catch accessibility regressions during E2E runs:

```typescript
import AxeBuilder from "@axe-core/playwright";

test("screen satisfies WCAG 2.2 AA contrast and semantics", async ({ page }) => {
  await page.goto("/overview");
  const accessibilityScan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .disableRules(["color-contrast"]) // Optional override if using custom high-contrast tokens
    .analyze();

  expect(accessibilityScan.violations).toEqual([]);
});
```

---

## 5. Instant Visual Proof & Locator Self-Healing

When a spec fails:
1. Review the locator in the stack trace.
2. Inspect the source component (e.g. `apps/web/src/components/ui/Button.tsx` or `PageHeader.tsx`).
3. If adjusting the markup, update the spec to use the accessible role or descriptive `data-testid` / `id`.
4. Run the single spec headlessly with visual screenshot proof saved to the active brain conversation directory (`<appDataDir>/brain/<conversation-id>/<name>.png`).
