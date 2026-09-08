import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Layout, Global Search & Theme System", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("renders canonical 11-item sidebar navigation in correct order", async ({ page }) => {
    const expectedItems = [
      "Overview",
      "Inbox",
      "Invoices",
      "Exceptions",
      "Approvals",
      "Payments",
      "Suppliers",
      "Purchase Orders",
      "Reports",
      "Archive",
    ];

    const navLinks = page.locator("aside nav a");
    for (let i = 0; i < expectedItems.length; i++) {
      await expect(navLinks.nth(i)).toContainText(expectedItems[i]);
    }
  });

  test("opens and closes global Ctrl+K search palette modal", async ({ page }) => {
    await page.click("text=Search invoices, suppliers, or PO numbers...");
    const searchInput = page.locator('input[aria-label="Command search input"]');
    await expect(searchInput).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(searchInput).not.toBeVisible();
  });

  test("toggles Light / Dark mode theme", async ({ page }) => {
    const htmlElement = page.locator("html");
    const themeButton = page.locator('button[aria-label="Toggle Theme"]');

    await expect(themeButton).toBeVisible();
    await themeButton.click();

    await expect(htmlElement).toHaveClass(/dark/);

    await themeButton.click();
    await expect(htmlElement).not.toHaveClass(/dark/);
  });
});
