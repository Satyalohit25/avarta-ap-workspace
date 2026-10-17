import { test, Page } from "@playwright/test";
import { loginAs, SEEDED_ACCOUNTS } from "./helpers/auth";
import fs from "fs";
import path from "path";

const BASE_OUT_DIR = path.resolve("d:/Antigravity/ap-saas/audit-screenshots");

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function captureScreen(page: Page, category: string, filename: string) {
  const dir = path.join(BASE_OUT_DIR, category);
  ensureDir(dir);
  const filePath = path.join(dir, filename);
  await page.waitForTimeout(400); // allow animations & transitions to settle
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`[SAVED] ${category}/${filename}`);
}

async function setDarkMode(page: Page, enabled: boolean) {
  await page.evaluate((isDark) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, enabled);
  await page.waitForTimeout(300);
}

test.describe("Exhaustive UI/UX, Development & Information Architecture Audit Capture", () => {
  test.setTimeout(900_000); // 15 minutes for complete capture

  test.beforeEach(async ({ page }) => {
    // Dismiss cookie banner & dev email verification banner universally
    await page.addInitScript(() => {
      localStorage.setItem("cookie_consent", "accepted");
      localStorage.setItem("avarta_email_verified", "true");
      localStorage.setItem("avarta_product_tour_dismissed", "true");
    });
  });

  test("Capture All Screens, States, Forms Filled, Modals, Drawers & Viewports", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // =========================================================================
    // SECTION 1: PUBLIC & AUTHENTICATION SCREENS
    // =========================================================================
    console.log("--> Section 1: Public & Authentication Screens");

    // 1.1 Login Page - Default (Light)
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "01_public_and_auth", "01-login-default-light.png");

    // 1.2 Login Page - Dark Mode
    await setDarkMode(page, true);
    await captureScreen(page, "01_public_and_auth", "02-login-default-dark.png");
    await setDarkMode(page, false);

    // 1.3 Login Page - Filled Valid
    await page.fill('#loginEmail, input[type="email"]', "manager@avarta.dev");
    await page.fill('#loginPassword, input[type="password"]', "password123");
    await captureScreen(page, "01_public_and_auth", "03-login-filled-valid.png");

    // 1.4 Login Page - Password Unmasked
    const eyeBtn = page.locator('button[aria-label*="password" i]').first();
    if (await eyeBtn.isVisible()) {
      await eyeBtn.click();
      await captureScreen(page, "01_public_and_auth", "04-login-password-unmasked.png");
      await eyeBtn.click();
    }

    // 1.5 Login Page - Validation Errors
    await page.fill('#loginEmail, input[type="email"]', "");
    await page.fill('#loginPassword, input[type="password"]', "");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(300);
    await captureScreen(page, "01_public_and_auth", "05-login-validation-errors.png");

    // 1.6 Sign Up Page - Default
    await page.goto("/signup");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "01_public_and_auth", "06-signup-default.png");

    // 1.7 Sign Up Page - Filled Valid
    await page.fill('input[name="fullName"], #fullName', "Vikram Malhotra");
    await page.fill('input[name="email"], #email', "v.malhotra@zenithind.com");
    await page.fill('input[name="companyName"], #companyName', "Zenith Industrial Supplies Pvt Ltd");
    await page.fill('input[name="password"], #password', "ZenithEnterprise2026!");
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check({ force: true });
    }
    await page.waitForTimeout(300);
    await captureScreen(page, "01_public_and_auth", "07-signup-filled.png");

    // 1.8 Forgot Password - Default
    await page.goto("/forgot-password");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "01_public_and_auth", "08-forgot-password-default.png");

    // 1.9 Forgot Password - Filled & Submitted
    await page.fill('input[type="email"]', "finance.director@acme.com");
    await captureScreen(page, "01_public_and_auth", "09-forgot-password-filled.png");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    await captureScreen(page, "01_public_and_auth", "10-forgot-password-submitted.png");

    // 1.10 Reset Password
    await page.goto("/reset-password?token=demo-secure-recovery-token-xyz");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "01_public_and_auth", "11-reset-password-default.png");
    const newPassInputs = page.locator('input[type="password"]');
    if (await newPassInputs.count() >= 2) {
      await newPassInputs.nth(0).fill("NewSecurePassword2026!");
      await newPassInputs.nth(1).fill("NewSecurePassword2026!");
    }
    await captureScreen(page, "01_public_and_auth", "12-reset-password-filled.png");

    // 1.11 Accept Invite
    await page.goto("/accept-invite?email=priya.sharma@clearops.dev&role=FINANCE_EXECUTIVE");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "01_public_and_auth", "13-accept-invite-default.png");
    const invitePassInputs = page.locator('input[type="password"]');
    if (await invitePassInputs.count() >= 2) {
      await invitePassInputs.nth(0).fill("PriyaSecret2026!");
      await invitePassInputs.nth(1).fill("PriyaSecret2026!");
    }
    await captureScreen(page, "01_public_and_auth", "14-accept-invite-filled.png");

    // 1.12 Public Vendor Invoice Tracker
    await page.goto("/track/INV-2026-1007");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(600);
    await captureScreen(page, "01_public_and_auth", "15-vendor-track-detail.png");

    // 1.13 Compliance & Legal Pages
    await page.goto("/privacy");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "01_public_and_auth", "16-privacy-policy.png");

    await page.goto("/terms");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "01_public_and_auth", "17-terms-of-service.png");

    await page.goto("/dpa");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "01_public_and_auth", "18-dpa.png");

    await page.goto("/subprocessors");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "01_public_and_auth", "19-subprocessors.png");

    await page.goto("/refund");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "01_public_and_auth", "20-refund-policy.png");

    // 1.14 Error Boundaries
    await page.goto("/403");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "01_public_and_auth", "21-forbidden-403.png");

    await page.goto("/unmapped-random-resource-path");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "01_public_and_auth", "22-not-found-404.png");

    // =========================================================================
    // SECTION 2: WORKSPACE LOGIN & OVERVIEW
    // =========================================================================
    console.log("--> Section 2: Workspace Login & Overview");

    await loginAs(page, SEEDED_ACCOUNTS.manager);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    // Ensure light mode
    await setDarkMode(page, false);

    // 2.1 Overview - Light Mode
    await captureScreen(page, "02_workspace_overview", "01-overview-light-desktop.png");

    // 2.2 Overview - Dark Mode
    await setDarkMode(page, true);
    await captureScreen(page, "02_workspace_overview", "02-overview-dark-desktop.png");
    await setDarkMode(page, false);

    // 2.3 Global Command Palette (⌘K)
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(400);
    await captureScreen(page, "02_workspace_overview", "03-overview-command-palette-open.png");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // 2.4 User Workspace Menu Popover
    const avatarMenuBtn = page.locator('button[aria-label*="user" i], button[aria-label*="workspace" i], header button:has(span[class*="avatar"]), header button:has(div[class*="avatar"])').last();
    if (await avatarMenuBtn.isVisible()) {
      await avatarMenuBtn.click();
      await page.waitForTimeout(300);
      await captureScreen(page, "02_workspace_overview", "04-overview-user-workspace-menu-open.png");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    // =========================================================================
    // SECTION 3: INBOX & INTAKE
    // =========================================================================
    console.log("--> Section 3: Inbox & Intake");

    await page.goto("/inbox");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    // 3.1 Inbox - Light Mode
    await captureScreen(page, "03_inbox_and_intake", "01-inbox-default-light.png");

    // 3.2 Inbox - Dark Mode
    await setDarkMode(page, true);
    await captureScreen(page, "03_inbox_and_intake", "02-inbox-dark-mode.png");
    await setDarkMode(page, false);

    // 3.3 Manual Invoice Intake Dialog
    const manualIntakeBtn = page.locator('button:has-text("Manual Invoice"), button:has-text("Enter Manual Invoice"), button:has-text("New Invoice")').first();
    if (await manualIntakeBtn.isVisible()) {
      await manualIntakeBtn.click();
      await page.waitForTimeout(400);
      await captureScreen(page, "03_inbox_and_intake", "03-inbox-manual-intake-dialog-empty.png");

      const invNumInput = page.locator('input[id*="invoiceNumber"], input[name="invoiceNumber"], input[placeholder*="INV-"]').first();
      if (await invNumInput.isVisible()) await invNumInput.fill("INV-2026-8801");

      const amountInput = page.locator('input[id*="amount"], input[name="amount"], input[type="number"]').first();
      if (await amountInput.isVisible()) await amountInput.fill("185000.00");

      const vendorSelect = page.locator('select[name="supplierId"], select[id*="supplier"]').first();
      if (await vendorSelect.isVisible()) {
        const options = await vendorSelect.locator("option").all();
        if (options.length > 1) {
          const val = await options[1].getAttribute("value");
          if (val) await vendorSelect.selectOption(val);
        }
      }
      await page.waitForTimeout(300);
      await captureScreen(page, "03_inbox_and_intake", "04-inbox-manual-intake-dialog-filled.png");

      const closeDlg = page.locator('button[aria-label="Close"], button:has-text("Cancel")').last();
      if (await closeDlg.isVisible()) await closeDlg.click();
      await page.waitForTimeout(200);
    }

    // =========================================================================
    // SECTION 4: INVOICES & WORKBENCH
    // =========================================================================
    console.log("--> Section 4: Invoices & Workbench");

    await page.goto("/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    // 4.1 Invoices - Light Mode
    await captureScreen(page, "04_invoices_and_workbench", "01-invoices-all-light.png");

    // 4.2 Invoices - Dark Mode
    await setDarkMode(page, true);
    await captureScreen(page, "04_invoices_and_workbench", "02-invoices-all-dark.png");
    await setDarkMode(page, false);

    // 4.3 Invoices Filter Tabs
    const invTabs = [
      { name: "Review", file: "03-invoices-filter-review.png" },
      { name: "Exception", file: "04-invoices-filter-exception.png" },
      { name: "Waiting Approval", file: "05-invoices-filter-waiting-approval.png" },
      { name: "Scheduled", file: "06-invoices-filter-scheduled.png" },
      { name: "Paid", file: "07-invoices-filter-paid.png" },
    ];
    for (const t of invTabs) {
      const tabBtn = page.getByRole("button", { name: t.name, exact: true });
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await page.waitForTimeout(400);
        await captureScreen(page, "04_invoices_and_workbench", t.file);
      }
    }

    const allInvTab = page.getByRole("button", { name: "All", exact: true });
    if (await allInvTab.isVisible()) await allInvTab.click();
    await page.waitForTimeout(300);

    // 4.4 Search Filter Active
    const invoiceSearch = page.locator('input[placeholder*="Search invoices" i], input[type="search"]').first();
    if (await invoiceSearch.isVisible()) {
      await invoiceSearch.fill("Tata Steel");
      await page.waitForTimeout(400);
      await captureScreen(page, "04_invoices_and_workbench", "08-invoices-search-active.png");
      await invoiceSearch.fill("");
      await page.waitForTimeout(300);
    }

    // 4.5 Bulk Selection Bar
    const selectCheckboxes = page.locator('table tbody tr input[type="checkbox"]');
    if (await selectCheckboxes.count() >= 2) {
      await selectCheckboxes.nth(0).check({ force: true });
      await selectCheckboxes.nth(1).check({ force: true });
      await page.waitForTimeout(300);
      await captureScreen(page, "04_invoices_and_workbench", "09-invoices-bulk-action-bar-active.png");
      await selectCheckboxes.nth(0).uncheck({ force: true });
      await selectCheckboxes.nth(1).uncheck({ force: true });
      await page.waitForTimeout(200);
    }

    // 4.6 Invoice Detail - Split-Screen OCR Workbench
    const invoiceLink = page.locator("table tbody tr td a").first();
    if (await invoiceLink.isVisible()) {
      await invoiceLink.click();
      await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);
      // Wait for data load to finish so skeleton is completely replaced by real content
      await page.waitForSelector(".animate-pulse", { state: "detached", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Light Mode Overview
      await captureScreen(page, "04_invoices_and_workbench", "10-invoice-detail-overview-splitscreen-light.png");

      // Dark Mode Overview
      await setDarkMode(page, true);
      await captureScreen(page, "04_invoices_and_workbench", "11-invoice-detail-overview-splitscreen-dark.png");
      await setDarkMode(page, false);

      // 3-Way Match Tri-Split Workbench
      const threeWaySection = page.locator('text=3-Way Match, text=Three-Way Match, [class*="MatchWorkbench"]').first();
      if (await threeWaySection.isVisible()) {
        await threeWaySection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await captureScreen(page, "04_invoices_and_workbench", "12-invoice-detail-three-way-match.png");
      }

      // Link PO / GRN Modal
      const linkPoBtn = page.locator('button:has-text("Link PO"), button:has-text("Link Purchase Order"), button:has-text("Link Entity")').first();
      if (await linkPoBtn.isVisible()) {
        await linkPoBtn.click();
        await page.waitForTimeout(400);
        await captureScreen(page, "04_invoices_and_workbench", "13-invoice-detail-entity-link-modal.png");
        const closeLink = page.locator('button[aria-label="Close"], button:has-text("Cancel")').last();
        if (await closeLink.isVisible()) await closeLink.click();
        await page.waitForTimeout(200);
      }

      // ERP Sync Modal
      const syncErpBtn = page.locator('button:has-text("Sync to ERP"), button:has-text("ERP Sync")').first();
      if (await syncErpBtn.isVisible()) {
        await syncErpBtn.click();
        await page.waitForTimeout(400);
        await captureScreen(page, "04_invoices_and_workbench", "14-invoice-detail-erp-sync-modal.png");
        const closeSync = page.locator('button[aria-label="Close"], button:has-text("Cancel")').last();
        if (await closeSync.isVisible()) await closeSync.click();
        await page.waitForTimeout(200);
      }
    }

    // =========================================================================
    // SECTION 5: EXCEPTIONS WORKBENCH
    // =========================================================================
    console.log("--> Section 5: Exceptions Workbench");

    await page.goto("/exceptions");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    // 5.1 Exceptions - Light Mode
    await captureScreen(page, "05_exceptions_workbench", "01-exceptions-list-all.png");

    // 5.2 Exceptions - Dark Mode
    await setDarkMode(page, true);
    await captureScreen(page, "05_exceptions_workbench", "02-exceptions-dark-mode.png");
    await setDarkMode(page, false);

    // 5.3 Exceptions - Inspector Drawer Open
    const exceptionRow = page.locator("table tbody tr").first();
    if (await exceptionRow.isVisible()) {
      await exceptionRow.click();
      await page.waitForTimeout(600);
      await captureScreen(page, "05_exceptions_workbench", "03-exceptions-inspector-drawer-open.png");

      // Resolution Filled
      const resolutionTextarea = page.locator('textarea[placeholder*="resolution" i], textarea[placeholder*="reason" i], textarea').first();
      if (await resolutionTextarea.isVisible()) {
        await resolutionTextarea.fill("Discretionary variance verified against vendor contract amendment #AM-2026-04. Price variance authorized by department head.");
        await page.waitForTimeout(300);
        await captureScreen(page, "05_exceptions_workbench", "04-exceptions-drawer-resolution-filled.png");
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }

    // =========================================================================
    // SECTION 6: APPROVALS INBOX
    // =========================================================================
    console.log("--> Section 6: Approvals Inbox");

    await page.goto("/approvals");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    // 6.1 Approvals - Light Mode
    await captureScreen(page, "06_approvals_inbox", "01-approvals-queue-all.png");

    // 6.2 Approvals - Dark Mode
    await setDarkMode(page, true);
    await captureScreen(page, "06_approvals_inbox", "02-approvals-dark-mode.png");
    await setDarkMode(page, false);

    // 6.3 Approvals - Inspector Sheet Open & Filled
    const approvalRow = page.locator("table tbody tr").first();
    if (await approvalRow.isVisible()) {
      await approvalRow.click();
      await page.waitForTimeout(600);
      await captureScreen(page, "06_approvals_inbox", "03-approvals-inspector-sheet-open.png");

      const remarksInput = page.locator('input[placeholder*="remark" i], textarea[placeholder*="remark" i], textarea[placeholder*="note" i], input[type="text"]').last();
      if (await remarksInput.isVisible()) {
        await remarksInput.fill("Approved under authorized Q4 procurement delegation. Goods receipt matches purchase specs.");
        await page.waitForTimeout(300);
        await captureScreen(page, "06_approvals_inbox", "04-approvals-remarks-filled.png");
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }

    // =========================================================================
    // SECTION 7: PAYMENTS OPERATIONS
    // =========================================================================
    console.log("--> Section 7: Payments Operations");

    await page.goto("/payments");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    // 7.1 Payments - Table Light Mode
    await captureScreen(page, "07_payments_operations", "01-payments-all-table.png");

    // 7.2 Payments - Dark Mode
    await setDarkMode(page, true);
    await captureScreen(page, "07_payments_operations", "02-payments-dark-mode.png");
    await setDarkMode(page, false);

    // 7.3 Status Tabs
    const paymentTabs = ["Awaiting Schedule", "Scheduled", "Processing", "Paid"];
    for (const pTab of paymentTabs) {
      const tabBtn = page.getByRole("button", { name: pTab, exact: true });
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await page.waitForTimeout(300);
        await captureScreen(page, "07_payments_operations", `03-payments-tab-${pTab.toLowerCase().replace(/\s+/g, "-")}.png`);
      }
    }

    const allPayTab = page.getByRole("button", { name: "All", exact: true });
    if (await allPayTab.isVisible()) await allPayTab.click();
    await page.waitForTimeout(200);

    // 7.4 Batch Selection & Disbursement Modal
    const payCheckboxes = page.locator('table tbody tr input[type="checkbox"]');
    if (await payCheckboxes.count() > 0) {
      await payCheckboxes.first().check({ force: true });
      if (await payCheckboxes.count() > 1) await payCheckboxes.nth(1).check({ force: true });
      await page.waitForTimeout(300);
      await captureScreen(page, "07_payments_operations", "04-payments-batch-selected.png");

      const disburseBtn = page.locator('button:has-text("Execute Batch Payout"), button:has-text("Execute Payout"), button:has-text("Schedule Payment")').first();
      if (await disburseBtn.isVisible()) {
        await disburseBtn.click();
        await page.waitForTimeout(500);
        await captureScreen(page, "07_payments_operations", "05-payments-disbursement-modal-open.png");
        const closeDisburse = page.locator('button[aria-label="Close"], button:has-text("Cancel")').last();
        if (await closeDisburse.isVisible()) await closeDisburse.click();
        await page.waitForTimeout(200);
      }
      await payCheckboxes.first().uncheck({ force: true });
    }

    // =========================================================================
    // SECTION 8: SUPPLIERS DIRECTORY
    // =========================================================================
    console.log("--> Section 8: Suppliers Directory");

    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    // 8.1 Suppliers - Table
    await captureScreen(page, "08_suppliers_directory", "01-suppliers-directory-table.png");

    // 8.2 Suppliers - Dark Mode
    await setDarkMode(page, true);
    await captureScreen(page, "08_suppliers_directory", "02-suppliers-dark-mode.png");
    await setDarkMode(page, false);

    // 8.3 Add Supplier Modal - Empty & Filled
    const addSupplierBtn = page.locator('button:has-text("Add Supplier"), button:has-text("New Supplier")').first();
    if (await addSupplierBtn.isVisible()) {
      await addSupplierBtn.click();
      await page.waitForTimeout(400);
      await captureScreen(page, "08_suppliers_directory", "03-suppliers-add-modal-empty.png");

      const nameInp = page.locator('input[name="name"], input[id*="name"]').first();
      if (await nameInp.isVisible()) await nameInp.fill("Nexus Industrial Technologies Pvt Ltd");

      const gstinInp = page.locator('input[name="gstin"], input[placeholder*="GSTIN"]').first();
      if (await gstinInp.isVisible()) await gstinInp.fill("29AABCN1234F1Z8");

      const panInp = page.locator('input[name="pan"], input[placeholder*="PAN"]').first();
      if (await panInp.isVisible()) await panInp.fill("AABCN1234F");

      const emailInp = page.locator('input[name="email"], input[type="email"]').last();
      if (await emailInp.isVisible()) await emailInp.fill("accounts@nexusind.com");

      const phoneInp = page.locator('input[name="phone"], input[type="tel"]').first();
      if (await phoneInp.isVisible()) await phoneInp.fill("+91 98765 43210");

      const bankAccInp = page.locator('input[name="bankAccount"], input[name="accountNumber"]').first();
      if (await bankAccInp.isVisible()) await bankAccInp.fill("987654321098");

      const ifscInp = page.locator('input[name="ifsc"], input[placeholder*="IFSC"]').first();
      if (await ifscInp.isVisible()) await ifscInp.fill("HDFC0001234");

      await page.waitForTimeout(300);
      await captureScreen(page, "08_suppliers_directory", "04-suppliers-add-modal-filled.png");

      const closeSupplierModal = page.locator('button[aria-label="Close"], button:has-text("Cancel")').last();
      if (await closeSupplierModal.isVisible()) await closeSupplierModal.click();
      await page.waitForTimeout(200);
    }

    // 8.4 Supplier Detail Drawer
    const supplierRow = page.locator("table tbody tr").first();
    if (await supplierRow.isVisible()) {
      await supplierRow.click();
      await page.waitForTimeout(600);
      await captureScreen(page, "08_suppliers_directory", "05-suppliers-detail-drawer.png");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    // =========================================================================
    // SECTION 9: PURCHASE ORDERS
    // =========================================================================
    console.log("--> Section 9: Purchase Orders");

    await page.goto("/purchase-orders");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    // 9.1 PO List - Light & Dark
    await captureScreen(page, "09_purchase_orders", "01-purchase-orders-list-table.png");
    await setDarkMode(page, true);
    await captureScreen(page, "09_purchase_orders", "02-purchase-orders-dark-mode.png");
    await setDarkMode(page, false);

    // 9.2 Create PO Modal - Empty & Filled
    const addPoBtn = page.locator('button:has-text("Create Purchase Order"), button:has-text("Create PO"), button:has-text("New PO")').first();
    if (await addPoBtn.isVisible()) {
      await addPoBtn.click();
      await page.waitForTimeout(400);
      await captureScreen(page, "09_purchase_orders", "03-purchase-orders-create-modal-empty.png");

      const poNumInp = page.locator('input[placeholder*="PO-"]').first();
      if (await poNumInp.isVisible()) await poNumInp.fill("PO-2026-9042");

      const poSupSelect = page.locator('select[name="supplierId"], select[id*="supplier"]').first();
      if (await poSupSelect.isVisible()) {
        const opts = await poSupSelect.locator("option").all();
        if (opts.length > 1) {
          const val = await opts[1].getAttribute("value");
          if (val) await poSupSelect.selectOption(val);
        }
      }

      const poLineDesc = page.locator('input[placeholder*="description" i], input[placeholder*="Item name" i]').first();
      if (await poLineDesc.isVisible()) await poLineDesc.fill("Precision Hydraulic Directional Control Valves");

      const poLineQty = page.locator('input[type="number"], input[placeholder*="Qty" i]').first();
      if (await poLineQty.isVisible()) await poLineQty.fill("50");

      const poLineRate = page.locator('input[type="number"], input[placeholder*="Price" i], input[placeholder*="Rate" i]').last();
      if (await poLineRate.isVisible()) await poLineRate.fill("4200");

      await page.waitForTimeout(300);
      await captureScreen(page, "09_purchase_orders", "04-purchase-orders-create-modal-filled.png");

      const closePoModal = page.locator('button[aria-label="Close"], button:has-text("Cancel")').last();
      if (await closePoModal.isVisible()) await closePoModal.click();
      await page.waitForTimeout(200);
    }

    // 9.3 PO Detail Drawer
    const poRow = page.locator("table tbody tr").first();
    if (await poRow.isVisible()) {
      await poRow.click();
      await page.waitForTimeout(600);
      await captureScreen(page, "09_purchase_orders", "05-purchase-orders-detail-drawer.png");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    // =========================================================================
    // SECTION 10: ITEMS CATALOG
    // =========================================================================
    console.log("--> Section 10: Items Catalog");

    await page.goto("/items");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    await captureScreen(page, "10_items_catalog", "01-items-catalog-table.png");
    await setDarkMode(page, true);
    await captureScreen(page, "10_items_catalog", "02-items-dark-mode.png");
    await setDarkMode(page, false);

    const addItemBtn = page.locator('button:has-text("Add Item"), button:has-text("New Item")').first();
    if (await addItemBtn.isVisible()) {
      await addItemBtn.click();
      await page.waitForTimeout(400);
      await captureScreen(page, "10_items_catalog", "03-items-add-modal-empty.png");

      const skuInp = page.locator('input[name="sku"], input[placeholder*="SKU" i]').first();
      if (await skuInp.isVisible()) await skuInp.fill("SKU-VALVE-50MM");

      const itemNameInp = page.locator('input[name="name"], input[placeholder*="Item Name" i]').first();
      if (await itemNameInp.isVisible()) await itemNameInp.fill("High-Pressure Hydraulic Valve 50mm");

      const itemPriceInp = page.locator('input[name="unitPrice"], input[type="number"]').first();
      if (await itemPriceInp.isVisible()) await itemPriceInp.fill("4500.00");

      const itemHsnInp = page.locator('input[name="hsnCode"], input[placeholder*="HSN" i]').first();
      if (await itemHsnInp.isVisible()) await itemHsnInp.fill("84818090");

      await page.waitForTimeout(300);
      await captureScreen(page, "10_items_catalog", "04-items-add-modal-filled.png");

      const closeItemModal = page.locator('button[aria-label="Close"], button:has-text("Cancel")').last();
      if (await closeItemModal.isVisible()) await closeItemModal.click();
      await page.waitForTimeout(200);
    }

    const itemRow = page.locator("table tbody tr").first();
    if (await itemRow.isVisible()) {
      await itemRow.click();
      await page.waitForTimeout(600);
      await captureScreen(page, "10_items_catalog", "05-items-detail-drawer.png");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    // =========================================================================
    // SECTION 11: BANK ACCOUNTS
    // =========================================================================
    console.log("--> Section 11: Bank Accounts");

    await page.goto("/bank-accounts");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    await captureScreen(page, "11_bank_accounts", "01-bank-accounts-cards-and-table.png");
    await setDarkMode(page, true);
    await captureScreen(page, "11_bank_accounts", "02-bank-accounts-dark-mode.png");
    await setDarkMode(page, false);

    const addBankBtn = page.locator('button:has-text("Add Bank Account"), button:has-text("New Bank Account")').first();
    if (await addBankBtn.isVisible()) {
      await addBankBtn.click();
      await page.waitForTimeout(400);
      await captureScreen(page, "11_bank_accounts", "03-bank-accounts-add-modal-empty.png");

      const bankHolderInp = page.locator('input[name="accountHolderName"], input[placeholder*="Holder" i]').first();
      if (await bankHolderInp.isVisible()) await bankHolderInp.fill("Acme Manufacturing Pvt Ltd");

      const bankNameInp = page.locator('input[name="bankName"], input[placeholder*="Bank Name" i]').first();
      if (await bankNameInp.isVisible()) await bankNameInp.fill("HDFC Bank Limited");

      const bankAccInp = page.locator('input[name="accountNumber"], input[placeholder*="Account Number" i]').first();
      if (await bankAccInp.isVisible()) await bankAccInp.fill("50200012345678");

      const bankIfscInp = page.locator('input[name="ifscCode"], input[placeholder*="IFSC" i]').first();
      if (await bankIfscInp.isVisible()) await bankIfscInp.fill("HDFC0000060");

      const bankBranchInp = page.locator('input[name="branchName"], input[placeholder*="Branch" i]').first();
      if (await bankBranchInp.isVisible()) await bankBranchInp.fill("Nariman Point, Mumbai");

      await page.waitForTimeout(300);
      await captureScreen(page, "11_bank_accounts", "04-bank-accounts-add-modal-filled.png");

      const closeBankModal = page.locator('button[aria-label="Close"], button:has-text("Cancel")').last();
      if (await closeBankModal.isVisible()) await closeBankModal.click();
      await page.waitForTimeout(200);
    }

    const bankRow = page.locator("table tbody tr").first();
    if (await bankRow.isVisible()) {
      await bankRow.click();
      await page.waitForTimeout(600);
      await captureScreen(page, "11_bank_accounts", "05-bank-accounts-detail-drawer.png");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    // =========================================================================
    // SECTION 12: REPORTS & ANALYTICS
    // =========================================================================
    console.log("--> Section 12: Reports & Analytics");

    await page.goto("/reports");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    await captureScreen(page, "12_reports_and_analytics", "01-reports-operational-kpis.png");
    await setDarkMode(page, true);
    await captureScreen(page, "12_reports_and_analytics", "02-reports-dark-mode.png");
    await setDarkMode(page, false);

    const agingTabBtn = page.getByRole("button", { name: "AP Aging & Cash Forecast", exact: false });
    if (await agingTabBtn.isVisible()) {
      await agingTabBtn.click();
      await page.waitForTimeout(500);
      await captureScreen(page, "12_reports_and_analytics", "03-reports-aging-cash-forecast-tab.png");
    }

    // =========================================================================
    // SECTION 13: COMPLIANCE ARCHIVE
    // =========================================================================
    console.log("--> Section 13: Compliance Archive");

    await page.goto("/archive");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    await captureScreen(page, "13_compliance_archive", "01-archive-compliance-table.png");
    await setDarkMode(page, true);
    await captureScreen(page, "13_compliance_archive", "02-archive-dark-mode.png");
    await setDarkMode(page, false);

    const archiveRow = page.locator("table tbody tr").first();
    if (await archiveRow.isVisible()) {
      await archiveRow.click();
      await page.waitForTimeout(600);
      await captureScreen(page, "13_compliance_archive", "03-archive-certificate-sheet.png");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    // =========================================================================
    // SECTION 14: SETTINGS & CONFIGURATION
    // =========================================================================
    console.log("--> Section 14: Settings & Configuration");

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    // 14.1 Org tab
    await captureScreen(page, "14_settings_and_admin", "01-settings-organization-tab.png");
    await setDarkMode(page, true);
    await captureScreen(page, "14_settings_and_admin", "02-settings-dark-mode.png");
    await setDarkMode(page, false);

    // Add Policy Rule Modal
    const addRuleBtn = page.locator('button:has-text("+ Add Policy Rule"), button:has-text("Add Policy Rule")').first();
    if (await addRuleBtn.isVisible()) {
      await addRuleBtn.click();
      await page.waitForTimeout(400);
      const ruleNameInp = page.locator('input[placeholder*="IT Software Subscriptions" i]').first();
      if (await ruleNameInp.isVisible()) await ruleNameInp.fill("Cloud Infrastructure & AI Workloads");

      const ruleThresholdInp = page.locator('input[placeholder*="> $25,000" i]').first();
      if (await ruleThresholdInp.isVisible()) await ruleThresholdInp.fill("> ₹2,50,000");

      const ruleDescInp = page.locator('input[placeholder*="departmental VP" i]').first();
      if (await ruleDescInp.isVisible()) await ruleDescInp.fill("Requires IT Director sign-off followed by Finance Manager release.");

      await page.waitForTimeout(300);
      await captureScreen(page, "14_settings_and_admin", "03-settings-add-approval-rule-modal-filled.png");

      const cancelRuleBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelRuleBtn.isVisible()) await cancelRuleBtn.click();
      await page.waitForTimeout(200);
    }

    // Traverse all tabs in Settings
    const settingsTabs = [
      { name: "AI & Storage Keys (BYOK)", file: "04-settings-byok-tab.png" },
      { name: "Database Sovereignty (BYODB)", file: "05-settings-byodb-tab.png" },
      { name: "ERP & Accounting Integrations", file: "06-settings-erp-sync-tab.png" },
      { name: "Payment Gateway (BYOPG)", file: "07-settings-payment-gateway-tab.png" },
      { name: "System Audit Log & Security Events", file: "08-settings-audit-logs-tab.png" },
      { name: "Team & Workspace Governance", file: "09-settings-team-governance-tab.png" },
      { name: "Subscription & Usage Quotas", file: "10-settings-billing-plans-tab.png" },
    ];

    for (const sTab of settingsTabs) {
      const tabBtn = page.getByRole("button", { name: sTab.name, exact: false });
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await page.waitForTimeout(400);
        await captureScreen(page, "14_settings_and_admin", sTab.file);

        if (sTab.name.includes("Team")) {
          const inviteBtn = page.locator('button:has-text("Invite Member"), button:has-text("Invite Team Member"), button:has-text("Add User")').first();
          if (await inviteBtn.isVisible()) {
            await inviteBtn.click();
            await page.waitForTimeout(400);
            await captureScreen(page, "14_settings_and_admin", "11-settings-invite-modal-empty.png");

            const invName = page.locator('input[placeholder*="full name" i], input[placeholder*="name" i]').first();
            if (await invName.isVisible()) await invName.fill("Sneha Kulkarni");

            const invEmail = page.locator('input[placeholder*="email" i], input[type="email"]').first();
            if (await invEmail.isVisible()) await invEmail.fill("s.kulkarni@acmewrk.com");

            await page.waitForTimeout(300);
            await captureScreen(page, "14_settings_and_admin", "12-settings-invite-modal-filled.png");

            const closeInv = page.locator('button[aria-label="Close"], button:has-text("Cancel")').last();
            if (await closeInv.isVisible()) await closeInv.click();
            await page.waitForTimeout(200);
          }
        }
      }
    }

    // =========================================================================
    // SECTION 15: NOTIFICATIONS CENTER
    // =========================================================================
    console.log("--> Section 15: Notifications Center");

    await page.goto("/notifications");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    await captureScreen(page, "15_notifications_center", "01-notifications-inbox-list.png");
    await setDarkMode(page, true);
    await captureScreen(page, "15_notifications_center", "02-notifications-dark-mode.png");
    await setDarkMode(page, false);

    const notifSettingsTab = page.getByRole("button", { name: "Preferences", exact: false });
    if (await notifSettingsTab.isVisible()) {
      await notifSettingsTab.click();
      await page.waitForTimeout(400);
      await captureScreen(page, "15_notifications_center", "03-notifications-preferences-tab.png");
    }

    // =========================================================================
    // SECTION 16: USER PROFILE
    // =========================================================================
    console.log("--> Section 16: User Profile");

    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await setDarkMode(page, false);

    await captureScreen(page, "16_user_profile", "01-profile-general-details.png");

    const currentPass = page.locator('input[placeholder*="current password" i], input[id*="currentPass"]').first();
    if (await currentPass.isVisible()) await currentPass.fill("password123");

    const newPass = page.locator('input[placeholder*="new password" i], input[id*="newPass"]').first();
    if (await newPass.isVisible()) await newPass.fill("AvartaStrongPass2026!");

    const confirmPass = page.locator('input[placeholder*="confirm" i], input[id*="confirmPass"]').first();
    if (await confirmPass.isVisible()) await confirmPass.fill("AvartaStrongPass2026!");

    await page.waitForTimeout(300);
    await captureScreen(page, "16_user_profile", "02-profile-change-password-filled.png");

    const newTokenBtn = page.locator('button:has-text("Generate Token"), button:has-text("New Token"), button:has-text("Create Token")').first();
    if (await newTokenBtn.isVisible()) {
      await newTokenBtn.click();
      await page.waitForTimeout(400);
      const tokenNameInp = page.locator('input[placeholder*="token name" i], input[placeholder*="e.g." i]').first();
      if (await tokenNameInp.isVisible()) await tokenNameInp.fill("Production ERP Sync Daemon");
      await page.waitForTimeout(300);
      await captureScreen(page, "16_user_profile", "03-profile-api-token-modal-filled.png");
      const closeTok = page.locator('button[aria-label="Close"], button:has-text("Cancel")').last();
      if (await closeTok.isVisible()) await closeTok.click();
      await page.waitForTimeout(200);
    }

    await setDarkMode(page, true);
    await captureScreen(page, "16_user_profile", "05-profile-dark-mode.png");
    await setDarkMode(page, false);

    // =========================================================================
    // SECTION 17: RESPONSIVE VIEWPORTS
    // =========================================================================
    console.log("--> Section 17: Responsive Viewports");

    // --- Mobile (390x844 - iPhone 14) ---
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await captureScreen(page, "17_responsive_mobile_and_tablet", "01-mobile-login.png");

    await loginAs(page, SEEDED_ACCOUNTS.manager);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await captureScreen(page, "17_responsive_mobile_and_tablet", "02-mobile-overview.png");

    const hamburgerBtn = page.locator('button[aria-label="Open navigation menu"]').first();
    if (await hamburgerBtn.isVisible()) {
      await hamburgerBtn.click();
      await page.waitForTimeout(400);
      await captureScreen(page, "17_responsive_mobile_and_tablet", "03-mobile-navigation-drawer.png");
      const closeMobileNav = page.locator('button[aria-label="Close navigation menu"], button[aria-label="Close"]').first();
      if (await closeMobileNav.isVisible()) {
        await closeMobileNav.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(300);
    }

    await page.goto("/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await captureScreen(page, "17_responsive_mobile_and_tablet", "04-mobile-invoices-list.png");

    const mobileInvLink = page.locator("table tbody tr td a").first();
    if (await mobileInvLink.isVisible()) {
      await mobileInvLink.click();
      await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);
      await page.waitForSelector(".animate-pulse", { state: "detached", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);
      await captureScreen(page, "17_responsive_mobile_and_tablet", "05-mobile-invoice-detail.png");
    }

    await page.goto("/exceptions");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await captureScreen(page, "17_responsive_mobile_and_tablet", "06-mobile-exceptions.png");

    await page.goto("/payments");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await captureScreen(page, "17_responsive_mobile_and_tablet", "07-mobile-payments.png");

    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await captureScreen(page, "17_responsive_mobile_and_tablet", "08-mobile-suppliers.png");

    // --- Tablet Viewport (820x1180 - iPad Air) ---
    await page.setViewportSize({ width: 820, height: 1180 });

    await page.goto("/overview");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await captureScreen(page, "17_responsive_mobile_and_tablet", "09-tablet-overview.png");

    await page.goto("/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await captureScreen(page, "17_responsive_mobile_and_tablet", "10-tablet-invoices-list.png");

    const tabletInvLink = page.locator("table tbody tr td a").first();
    if (await tabletInvLink.isVisible()) {
      await tabletInvLink.click();
      await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);
      await page.waitForSelector(".animate-pulse", { state: "detached", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);
      await captureScreen(page, "17_responsive_mobile_and_tablet", "11-tablet-invoice-detail.png");
    }

    await page.goto("/reports");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await captureScreen(page, "17_responsive_mobile_and_tablet", "12-tablet-reports.png");

    console.log("--> ALL AUDIT SCREENSHOTS CAPTURED PERFECTLY!");
  });
});
