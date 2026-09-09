import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Approvals & Payments Workflows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("loads Approvals Queue", async ({ page }) => {
    await page.goto("/approvals");
    await expect(page.locator("h1")).toHaveText("Approvals");
  });

  test("loads Payments Schedule", async ({ page }) => {
    await page.goto("/payments");
    await expect(page.locator("h1")).toContainText("Payments");
  });

  test("loads Suppliers Directory", async ({ page }) => {
    await page.goto("/suppliers");
    await expect(page.locator("h1")).toHaveText("Suppliers");
  });
});
