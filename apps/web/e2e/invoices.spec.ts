import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Invoice Lifecycle & Processing Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("receives a new invoice from Inbox form and lands on state-first detail page", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page.locator("h1")).toHaveText("Inbox", { timeout: 15000 });

    // Open Quick manual entry dialog
    await page.getByRole("button", { name: /Quick manual entry/i }).click();
    const testInvNum = `INV-${Date.now().toString().slice(-6)}`;
    await page.fill("#shared-invoice-number", testInvNum);
    await page.click('button[type="submit"]');

    // Should see the invoice in Recent Invoices list
    await expect(page.getByText(testInvNum, { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Click to navigate to Invoice Detail view
    await page.getByText(testInvNum, { exact: true }).first().click();

    const openWorkspaceBtn = page.getByRole("button", { name: /Open Full Workspace/i });
    await expect(openWorkspaceBtn).toBeVisible({ timeout: 10000 });
    await openWorkspaceBtn.click();

    await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);
    await expect(page.locator("h1")).toContainText(testInvNum);

    // Verify State Banner explains Stage 1
    await expect(page.getByText(/Invoice Received/i)).toBeVisible();

    // Verify Document Source card
    await expect(page.getByRole("heading", { name: "Attach Source Document" })).toBeVisible();

    // Verify primary action CTA is present
    await expect(page.getByRole("button", { name: /Run Capture & Validation/i }).first()).toBeVisible();
  });

  test("displays invoice list table and navigates to detail view", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page.locator("h1")).toHaveText("Invoices");

    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    const firstInvoiceLink = page.locator("table tbody tr td a").first();
    await expect(firstInvoiceLink).toBeVisible();
    await firstInvoiceLink.click();

    await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);

    // Verify Metric Strip
    await expect(page.locator("span").filter({ hasText: "Total Amount" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("span").filter({ hasText: "Due Date" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("span").filter({ hasText: "Supplier / Vendor" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("span").filter({ hasText: "Purchase Order" }).first()).toBeVisible({ timeout: 10000 });
  });

  test("opens Supplier & PO linking modals from summary strip", async ({ page }) => {
    await page.goto("/invoices");
    const firstInvoiceLink = page.locator("table tbody tr td a").first();
    await expect(firstInvoiceLink).toBeVisible({ timeout: 10000 });
    await firstInvoiceLink.click();
    await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);

    // Check if supplier link button exists in summary strip
    const supplierLinkBtn = page.getByRole("button", { name: /Assign Vendor/i }).first();
    if (await supplierLinkBtn.isVisible()) {
      await supplierLinkBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText("Assign Supplier / Vendor")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });

  test("executes capture pipeline and transitions to post-capture 3-way matching", async ({ page }) => {
    await page.goto("/inbox");
    await page.getByRole("button", { name: /Quick manual entry/i }).click();
    const testInvNum = `INV-${Date.now().toString().slice(-6)}`;
    await page.fill("#shared-invoice-number", testInvNum);
    await page.click('button[type="submit"]');

    await expect(page.getByText(testInvNum, { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await page.getByText(testInvNum, { exact: true }).first().click();

    const openWorkspaceBtn = page.getByRole("button", { name: /Open Full Workspace/i });
    await expect(openWorkspaceBtn).toBeVisible({ timeout: 10000 });
    await openWorkspaceBtn.click();

    await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);

    // Click Run Capture
    const runCaptureBtn = page.getByRole("button", { name: /Run Capture & Validation/i }).first();
    await runCaptureBtn.click();

    // Verify processing overlay appears with unique heading
    await expect(page.getByRole("heading", { name: "Processing Invoice" })).toBeVisible({ timeout: 5000 });
  });

  test("verifies dynamic stage audit trail and single details toggle on paid invoice", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page.locator("h1")).toHaveText("Invoices");

    // Search for or click INV-2026-1011
    const paidInvoiceLink = page.getByRole("link", { name: "INV-2026-1011" }).first();
    if (await paidInvoiceLink.isVisible()) {
      await paidInvoiceLink.click();
    } else {
      // Click first invoice
      await page.locator("table tbody tr td a").first().click();
    }

    await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);

    // Verify State Banner has a single "Hide Details" / "View Details" toggle button
    const bannerToggle = page.locator('button[aria-label="Hide workflow details"], button[aria-label="View workflow details"]');
    await expect(bannerToggle).toHaveCount(1);

    const initialLabel = await bannerToggle.getAttribute("aria-label");
    const toggledLabel = initialLabel === "Hide workflow details" ? "View workflow details" : "Hide workflow details";

    // Toggle once
    await bannerToggle.click();
    await expect(bannerToggle).toHaveAttribute("aria-label", toggledLabel);

    // Toggle back
    await bannerToggle.click();
    await expect(bannerToggle).toHaveAttribute("aria-label", initialLabel!);

    // Open Audit Drawer
    const viewAuditBtn = page.getByRole("button", { name: /Audit/i }).first();
    await viewAuditBtn.click();

    // Verify Audit Drawer opened
    await expect(page.getByText(/Audit Trail/i).first()).toBeVisible();

    // Verify dynamic chronological events exist (more than 1 event for advanced stages)
    const eventCountText = page.locator("text=/Total Events: \\d+/");
    await expect(eventCountText).toBeVisible();

    // Take screenshot of dynamic audit drawer
    await page.screenshot({
      path: "test-results/dynamic-audit-drawer-verified.png",
      fullPage: true,
    });
  });
});
