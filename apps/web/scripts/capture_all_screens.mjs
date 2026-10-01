import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const ARTIFACT_SCREENSHOT_DIR = "C:/Users/lohit/.gemini/antigravity-ide/brain/8af20480-144f-418c-b8b9-cbdfd2033ee0/screenshots";

if (!fs.existsSync(ARTIFACT_SCREENSHOT_DIR)) {
  fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true });
}

async function capture() {
  console.log("Launching Chromium (1440x900 @ 1.5x scale)...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("PAGE CONSOLE ERROR:", msg.text());
  });
  page.on("pageerror", (err) => console.log("PAGE UNCAUGHT ERROR:", err.message));

  // 1. Login Page
  console.log("1/16 Capturing 01_login.png...");
  await page.goto("http://localhost:5173/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('button:has-text("Sign in")', { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "01_login.png") });

  // Submit Login
  console.log("Submitting login as manager@avarta.dev...");
  await page.fill('input[type="email"]', "manager@avarta.dev");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/overview", { timeout: 15000 });

  // 2. Overview
  console.log("2/16 Capturing 02_overview.png...");
  await page.waitForSelector('text="Mission Control"', { timeout: 15000 });
  await page.waitForSelector('text="TOTAL OUTSTANDING"', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "02_overview.png") });

  // 3. Inbox
  console.log("3/16 Capturing 03_inbox.png...");
  await page.goto("http://localhost:5173/inbox", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('text="Inbound Ingestion Mailbox"', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "03_inbox.png") });

  // 4. Invoices
  console.log("4/16 Capturing 04_invoices.png...");
  await page.goto("http://localhost:5173/invoices", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "04_invoices.png") });

  // 5. Invoice Detail: Look for INV-2026-1018 or an active exception
  console.log("5/16 Capturing 05_invoice_detail.png...");
  const targetInvoice = page.locator("a:has-text('INV-2026-1018'), a:has-text('INV-2026-1012'), a:has-text('INV-2026-1022')").first();
  if (await targetInvoice.count() > 0) {
    const detailHref = await targetInvoice.getAttribute("href");
    console.log("Navigating to target invoice detail:", detailHref);
    await page.goto(`http://localhost:5173${detailHref}`, { waitUntil: "domcontentloaded" });
  } else {
    const anyLink = page.locator("table tbody tr a").first();
    const detailHref = await anyLink.getAttribute("href");
    await page.goto(`http://localhost:5173${detailHref}`, { waitUntil: "domcontentloaded" });
  }
  await page.waitForSelector('text="Extracted Invoice Details"', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "05_invoice_detail.png") });

  // 6. Exceptions
  console.log("6/16 Capturing 06_exceptions.png...");
  await page.goto("http://localhost:5173/exceptions", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('table tbody tr, h1', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "06_exceptions.png") });

  // 7. Approvals
  console.log("7/16 Capturing 07_approvals.png...");
  await page.goto("http://localhost:5173/approvals", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('table tbody tr, h1', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "07_approvals.png") });

  // 8. Payments
  console.log("8/16 Capturing 08_payments.png...");
  await page.goto("http://localhost:5173/payments", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "08_payments.png") });

  // 9. Suppliers
  console.log("9/16 Capturing 09_suppliers.png...");
  await page.goto("http://localhost:5173/suppliers", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "09_suppliers.png") });

  // 10. Purchase Orders
  console.log("10/16 Capturing 10_purchase_orders.png...");
  await page.goto("http://localhost:5173/purchase-orders", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "10_purchase_orders.png") });

  // 11. Reports
  console.log("11/16 Capturing 11_reports.png...");
  await page.goto("http://localhost:5173/reports", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('text="Operational Throughput & KPIs"', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "11_reports.png") });

  // 12. Archive
  console.log("12/16 Capturing 12_archive.png...");
  await page.goto("http://localhost:5173/archive", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('table tbody tr', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "12_archive.png") });

  // 13. Settings
  console.log("13/16 Capturing 13_settings.png...");
  await page.goto("http://localhost:5173/settings", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('text="Organization & Financial Controls"', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "13_settings.png") });

  // 14. Notifications
  console.log("14/16 Capturing 14_notifications.png...");
  await page.goto("http://localhost:5173/notifications", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('h1:has-text("Notifications")', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "14_notifications.png") });

  // 15. Profile
  console.log("15/16 Capturing 15_profile.png...");
  await page.goto("http://localhost:5173/profile", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('h1:has-text("User Profile")', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "15_profile.png") });

  // 16. Public Vendor Tracking
  console.log("16/16 Capturing 16_vendor_tracking.png...");
  await page.goto("http://localhost:5173/track/demo-token", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('text="Live Verification"', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_SCREENSHOT_DIR, "16_vendor_tracking.png") });

  console.log("ALL 16 FRESH SCREENSHOTS CAPTURED PERFECTLY!");
  await browser.close();
}

capture().catch((err) => {
  console.error("Capture script error:", err);
  process.exit(1);
});
