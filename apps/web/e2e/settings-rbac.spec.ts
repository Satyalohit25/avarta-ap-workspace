import { test, expect } from "@playwright/test";
import { loginAs, SEEDED_ACCOUNTS } from "./helpers/auth";

test.describe("Item 7: Settings Role-Based Access Consistency", () => {
  const roles = [
    { key: "admin", account: SEEDED_ACCOUNTS.admin, canManageIntegrations: true },
    { key: "manager", account: SEEDED_ACCOUNTS.manager, canManageIntegrations: false },
    { key: "executive", account: SEEDED_ACCOUNTS.executive, canManageIntegrations: false },
    { key: "approver", account: SEEDED_ACCOUNTS.approver, canManageIntegrations: false },
    { key: "readonly", account: SEEDED_ACCOUNTS.readonly, canManageIntegrations: false },
  ];

  for (const { key, account, canManageIntegrations } of roles) {
    test(`role ${account.role} (${key}) sees consistent tabs and zero console/toast errors on /settings`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => {
        consoleErrors.push(err.message);
      });

      await loginAs(page, account);
      await page.goto("/settings");

      // Verify page title loaded
      await expect(page.getByRole("heading", { name: "Settings & Workspace Configuration" })).toBeVisible();

      // Check integration tabs visibility
      const byokTab = page.getByRole("tab", { name: /AI & Storage Keys/i });
      const erpTab = page.getByRole("tab", { name: /ERP & Accounting Integrations/i });

      if (canManageIntegrations) {
        await expect(byokTab).toBeVisible();
        await expect(erpTab).toBeVisible();
      } else {
        await expect(byokTab).toHaveCount(0);
        await expect(erpTab).toHaveCount(0);
      }

      // Verify no unauthorized or error toast notifications popped up
      const errorToast = page.locator('[role="alert"]').filter({ hasText: /error|forbidden|unauthorized/i });
      await expect(errorToast).toHaveCount(0);

      // Verify zero console or page errors
      const realErrors = consoleErrors.filter(
        (e) => !e.includes("favicon") && !e.includes("[vite]")
      );
      expect(realErrors).toHaveLength(0);
    });
  }
});
