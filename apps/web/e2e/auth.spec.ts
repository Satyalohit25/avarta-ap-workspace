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
    await expect(page.locator("header").first()).toContainText(/Finance Manager|FINANCE_MANAGER/);
  });

  test("authenticates successfully with seeded admin account", async ({ page }) => {
    await loginAs(page, SEEDED_ACCOUNTS.admin);
    await expect(page.locator("header").first()).toContainText(/Administrator|ADMINISTRATOR/);
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
    await page.locator('button[aria-haspopup="true"]').first().click();
    await page.click("text=Sign out");
    await page.waitForURL("**/login*");
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
  });

  test("with signup disabled, /signup shows message, back link, and no form fields", async ({ page }) => {
    await page.route("**/api/v1/auth/config", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ signupEnabled: false }),
      });
    });

    await page.goto("/signup");

    // 1. Notice message must be visible
    const disabledMsg = page.locator("text=Self-service signup is not available. Contact your administrator for an invitation.");
    await expect(disabledMsg).toBeVisible();

    // 2. Back to sign in button must be visible
    const backBtn = page.getByRole("button", { name: "Back to sign in" });
    await expect(backBtn).toBeVisible();

    // 3. Form fields must NOT exist in the DOM
    await expect(page.locator("#signupEmail")).toHaveCount(0);
    await expect(page.locator("#signupPassword")).toHaveCount(0);
    await expect(page.locator("#signupFullName")).toHaveCount(0);
    await expect(page.locator("#signupCompanyName")).toHaveCount(0);
    await expect(page.locator('button[type="submit"]')).toHaveCount(0);

    // 4. Clicking Back to sign in navigates to /login
    await backBtn.click();
    await page.waitForURL("**/login*");
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
  });

  test("with signup disabled, /login hides the Create a workspace link and defaults password to masked", async ({ page }) => {
    await page.route("**/api/v1/auth/config", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ signupEnabled: false }),
      });
    });

    await page.goto("/login");
    await expect(page.locator("#loginEmail")).toBeVisible();
    await expect(page.locator("#loginPassword")).toHaveAttribute("type", "password");

    // The Create a workspace link should not be present
    await expect(page.locator('a[href="/signup"]')).toHaveCount(0);
  });

  test("on /signup, any submission error keeps a visible Back to sign in link", async ({ page }) => {
    await page.route("**/api/v1/auth/config", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ signupEnabled: true }),
      });
    });

    await page.route("**/api/v1/auth/signup", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: { message: "Public signup is disabled in production." }
        }),
      });
    });

    await page.goto("/signup");
    await expect(page.locator("#signupPassword")).toHaveAttribute("type", "password");

    await page.fill("#signupFullName", "Test Admin");
    await page.fill("#signupEmail", "admin-test@corp.com");
    await page.fill("#signupCompanyName", "Test Enterprise");
    await page.fill("#signupPassword", "SuperSecurePassword123!");
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');

    // Error alert must contain Back to sign in link
    const backToSignInLink = page.getByRole("link", { name: /Back to sign in/i });
    await expect(backToSignInLink.first()).toBeVisible();
  });
});
