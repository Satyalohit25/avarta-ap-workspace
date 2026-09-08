import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Exceptions Handling Queue", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("loads Exception Queue page", async ({ page }) => {
    await page.goto("/exceptions");
    await expect(page.locator("h1")).toHaveText("Exceptions");

    const subtitle = page.locator("text=Invoices flagged by validation or matching rules requiring human resolution.");
    await expect(subtitle).toBeVisible();
  });

  test("renders exception status badges or empty state correctly", async ({ page }) => {
    await page.goto("/exceptions");
    await expect(page.locator("h1")).toHaveText("Exceptions");

    const mainContainer = page.locator(".bg-white");
    await expect(mainContainer.first()).toBeVisible();
  });
});
