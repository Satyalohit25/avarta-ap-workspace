import { Page, expect } from "@playwright/test";

export const SEEDED_ACCOUNTS = {
  manager: { email: "manager@avarta.dev", password: "password123", role: "Finance Manager" },
  admin: { email: "admin@avarta.dev", password: "password123", role: "Administrator" },
  executive: { email: "executive@avarta.dev", password: "password123", role: "Finance Executive" },
  approver: { email: "approver@avarta.dev", password: "password123", role: "Approver" },
};

export async function loginAs(
  page: Page,
  account: { email: string; password: string } = SEEDED_ACCOUNTS.manager
) {
  await page.goto("/login");
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/overview");
  await expect(page).toHaveURL(/\/overview$/);
}
