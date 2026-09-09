import { test, expect } from "@playwright/test";
import { loginAs, SEEDED_ACCOUNTS } from "./helpers/auth";

test.describe("Authentication Flow & Login UI", () => {
  test("renders login page with proper accessibility labels and workspace titles", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toHaveText("Avarta");
    await expect(page.locator("text=Accounts Payable Workspace")).toBeVisible();

    const emailInput = page.locator("#loginEmail");
    const passwordInput = page.locator("#loginPassword");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("aria-label", "Email address");
    await expect(passwordInput).toHaveAttribute("aria-label", "Password");
  });

  test("authenticates successfully with seeded manager account", async ({ page }) => {
    await loginAs(page, SEEDED_ACCOUNTS.manager);
    await expect(page.locator("header").first()).toContainText("FINANCE_MANAGER");
  });

  test("authenticates successfully with seeded admin account", async ({ page }) => {
    await loginAs(page, SEEDED_ACCOUNTS.admin);
    await expect(page.locator("header").first()).toContainText("ADMINISTRATOR");
  });

  test("displays error message on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#loginEmail", "invalid@avarta.dev");
    await page.fill("#loginPassword", "wrongpassword");
    await page.click('button[type="submit"]');

    const errorMessage = page.locator(".text-error-700");
    await expect(errorMessage).toBeVisible();
  });

  test("logs out user and redirects to login", async ({ page }) => {
    await loginAs(page, SEEDED_ACCOUNTS.manager);
    await page.click("text=Sign out");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login$/);
  });
});
