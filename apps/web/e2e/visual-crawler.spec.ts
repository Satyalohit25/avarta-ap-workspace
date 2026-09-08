import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = path.resolve("e2e-screenshots");

test.beforeAll(async () => {
  console.log("Saving screenshots to:", SCREENSHOT_DIR);
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test.describe("Visual Crawl & Interactive Surface Mapper", () => {
  const consoleLogs: Array<{ type: string; text: string; location?: string }> =
    [];
  const networkErrors: Array<{ url: string; status: number }> = [];

  test("Comprehensive Crawl & Screenshot Capture", async ({ page }) => {
    test.setTimeout(180000);
    // Collect console logs & network failures
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        consoleLogs.push({
          type: msg.type(),
          text: msg.text(),
          location: msg.location().url,
        });
      }
    });

    page.on("response", (res) => {
      if (res.status() >= 400) {
        networkErrors.push({ url: res.url(), status: res.status() });
      }
    });

    // 1. Unauthenticated Login Screen
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01-login-page.png"),
      fullPage: true,
    });

    // Login
    await loginAs(page);

    // 2. Overview / Mission Control (Light Mode)
    await page
      .waitForSelector("text=Waiting Approval", { timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "02-overview-light.png"),
      fullPage: true,
    });

    // Dark Mode test on Overview
    const themeBtn = page.locator('button[aria-label="Toggle Theme"]');
    await themeBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "02-overview-dark.png"),
      fullPage: true,
    });
    await themeBtn.click(); // revert back to light mode
    await page.waitForTimeout(300);

    // 3. Inbox Page
    await page.goto("/inbox");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03-inbox-page.png"),
      fullPage: true,
    });

    // 4. Invoices List Page (All & Filter Tabs)
    await page.goto("/invoices");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-invoices-all.png"),
      fullPage: true,
    });

    // Filter Tabs
    const filterTabs = ["Review", "Exception", "Waiting Approval", "Paid"];
    for (const tabName of filterTabs) {
      const tabBtn = page.getByRole("button", { name: tabName, exact: true });
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(
            SCREENSHOT_DIR,
            `04-invoices-filter-${tabName.toLowerCase().replace(/\s+/g, "-")}.png`,
          ),
          fullPage: true,
        });
      }
    }

    // 5. Invoice Detail Page & Action Dialogs
    await page.goto("/invoices");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    const firstInvoiceLink = page.locator("table tbody tr td a").first();
    if (await firstInvoiceLink.isVisible()) {
      await firstInvoiceLink.click();
      await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "05-invoice-detail-main.png"),
        fullPage: true,
      });

      // Capture Slide-Out Audit History Drawer (Package A)
      const auditDrawerBtn = page.getByRole("button", { name: /Audit History/i });
      if (await auditDrawerBtn.isVisible()) {
        await auditDrawerBtn.click();
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "05-invoice-detail-audit-drawer.png"),
        });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }

      // Check if action dialog can be opened (e.g. Approve or Reject button)
      const approveBtn = page.getByRole("button", { name: /Approve/i }).first();
      if (await approveBtn.isVisible()) {
        await approveBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(
            SCREENSHOT_DIR,
            "05-invoice-detail-approve-dialog.png",
          ),
        });
        // Close modal without submitting
        const cancelBtn = page.getByRole("button", { name: /Cancel/i });
        if (await cancelBtn.isVisible()) await cancelBtn.click();
      }
    }

    // 6. Exceptions Page
    await page.goto("/exceptions");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06-exceptions-page.png"),
      fullPage: true,
    });

    // 7. Approvals Page
    await page.goto("/approvals");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "07-approvals-page.png"),
      fullPage: true,
    });

    // 8. Payments Page & Full Lifecycle (Configuring -> Fail State -> Success Receipt)
    await page.goto("/payments");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "08-payments-page.png"),
      fullPage: true,
    });

    // 1. Test single invoice Execute button opening the disbursement modal
    const singleExecuteBtn = page.getByRole("button", { name: /^Execute$/i }).first();
    if (await singleExecuteBtn.isVisible()) {
      await singleExecuteBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "08-payments-single-disbursement-modal.png"),
      });

      // Test EDGE CASE: Simulate Gateway Timeout Failure State
      const simulateCheckbox = page.getByLabel(/Simulate Gateway Timeout/i);
      if (await simulateCheckbox.isVisible()) {
        await simulateCheckbox.check();
        await page.waitForTimeout(200);

        // Click Disburse & Trigger Gateway Timeout
        const disburseBtn = page.getByRole("button", { name: /Disburse/i });
        await disburseBtn.click();
        await page.waitForTimeout(1400);

        // Capture Failure State Screen
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "08-payments-failure-state.png"),
        });

        // Test Recovery: Click "Edit Account or Rail" to return to configuring
        const editBtn = page.getByRole("button", { name: /Edit Account or Rail/i });
        if (await editBtn.isVisible()) {
          await editBtn.click();
          await page.waitForTimeout(300);

          // Uncheck simulation to execute successful settlement
          await simulateCheckbox.uncheck();
          await page.waitForTimeout(200);

          // Click Disburse for successful settlement
          await disburseBtn.click();
          await page.waitForTimeout(1500);

          // Capture Success State / Settlement Receipt Screen
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, "08-payments-success-receipt.png"),
          });

          // Click "Done & Return to Payments"
          const doneBtn = page.getByRole("button", { name: /Done & Return to Payments/i });
          if (await doneBtn.isVisible()) {
            await doneBtn.click();
            await page.waitForTimeout(500);
            await page.screenshot({
              path: path.join(SCREENSHOT_DIR, "08-payments-page-settled-banner.png"),
              fullPage: true,
            });

            // 1b. Test FX / Cross-Currency Edge Case on Siemens AG (EUR)
            const eurExecuteBtn = page.getByRole("button", { name: /^Execute$/i }).first();
            if (await eurExecuteBtn.isVisible()) {
              await eurExecuteBtn.click();
              await page.waitForTimeout(400);
              await page.screenshot({
                path: path.join(SCREENSHOT_DIR, "08-payments-fx-edge-case-modal.png"),
              });
              await page.keyboard.press("Escape");
              await page.waitForTimeout(200);
            }
          }
        }
      }
    }

    // 2. Select multiple rows to test batch payment bar & multi-item modal
    const checkboxes = page.locator("table tbody tr td input[type='checkbox']");
    const checkboxCount = await checkboxes.count();
    if (checkboxCount > 0) {
      for (let i = 0; i < checkboxCount; i++) {
        await checkboxes.nth(i).click();
      }
      await page.waitForTimeout(300);
      const batchBtn = page.getByRole("button", { name: /Release Batch Disbursement/i });
      if (await batchBtn.isVisible()) {
        await batchBtn.click();
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "08-payments-batch-disbursement-modal.png"),
        });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
    }

    // 9. Suppliers Page
    await page.goto("/suppliers");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "09-suppliers-page.png"),
      fullPage: true,
    });

    // 10. Purchase Orders Page
    await page.goto("/purchase-orders");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "10-purchase-orders-page.png"),
      fullPage: true,
    });

    // 11. Reports Page
    await page.goto("/reports");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "11-reports-page.png"),
      fullPage: true,
    });

    // 12. Archive Page
    await page.goto("/archive");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "12-archive-page.png"),
      fullPage: true,
    });

    // 13. Settings Page
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "13-settings-page.png"),
      fullPage: true,
    });

    // 14. Command Palette (Ctrl+K)
    await page.click("text=Search invoices, suppliers, or PO numbers...");
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "14-command-palette-modal.png"),
    });
    await page.keyboard.press("Escape");

    // 15. Notifications Feed
    await page.goto("/notifications");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "15-notifications-fallback.png"),
      fullPage: true,
    });

    // 16. User Profile (Personal Details & Scoped API Tokens)
    await page.goto("/profile");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "16-user-profile.png"),
      fullPage: true,
    });

    // 17. Public Vendor Tracking Portal (Package B)
    await page.goto("/invoices/track/INV-2026-1007");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "17-vendor-portal-tracking.png"),
      fullPage: true,
    });

    // Save Crawl Log & Error Report
    const reportData = {
      timestamp: new Date().toISOString(),
      consoleLogs,
      networkErrors,
    };
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, "crawl-report.json"),
      JSON.stringify(reportData, null, 2),
    );
  });

  test("Mobile Viewport Crawl (375x812)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page);
    await page.goto("/overview");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "16-mobile-overview.png"),
      fullPage: true,
    });
  });
});
