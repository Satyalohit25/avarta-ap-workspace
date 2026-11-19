import { test, expect } from "@playwright/test";
import { loginAs, SEEDED_ACCOUNTS } from "./helpers/auth";

test.describe("T-401: Accounts Payable End-to-End Happy-Path Workflow", () => {
  const runId = Date.now().toString().slice(-6);
  const supplierCode = `SUP-HP-${runId}`;
  const supplierName = `Apex Logistics ${runId} Ltd`;
  const poNumber = `PO-HP-${runId}`;
  const invoiceNumber = `INV-HP-${runId}`;
  const bankAccountNum = `987654${runId}`;
  const utrNumber = `UTR${runId}998877`;

  test("completes linear AP lifecycle from intake through archive with dual-user approval and state assertions", async ({
    page,
  }) => {
    // -------------------------------------------------------------------------
    // Stage 0: Sign in as Finance Executive (Daily intake & invoice capture)
    // -------------------------------------------------------------------------
    await loginAs(page, SEEDED_ACCOUNTS.executive);
    await expect(page).toHaveURL(/\/overview$/);

    // Verify Overview surface renders KPIs & Horizon strip
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Financial Horizon").first()).toBeVisible();

    // Verify sidebar navigation items and badges are mounted
    const sidebar = page.locator("aside, nav");
    await expect(sidebar.getByRole("link", { name: /Invoices/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Inbox/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Approvals/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Payments/i })).toBeVisible();

    // -------------------------------------------------------------------------
    // Stage 1: Master Data Setup — Add Supplier & Verified Bank Account
    // -------------------------------------------------------------------------
    await page.goto("/suppliers");
    await expect(page.getByRole("heading", { name: "Suppliers" })).toBeVisible();

    // Open Onboard New Supplier 3-section dialog
    await page.getByRole("button", { name: /Add Supplier/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Onboard New Supplier")).toBeVisible();

    // Section 1: Entity Details
    await page.getByLabel("Legal Name").fill(supplierName);
    const codeInput = page.getByLabel("Supplier Code");
    if (await codeInput.isVisible()) {
      await codeInput.fill(supplierCode);
    }
    const panInput = page.getByLabel("PAN Number");
    if (await panInput.isVisible()) {
      await panInput.fill("AAACG1234F"); // Valid corporate PAN
    }
    const gstInput = page.getByLabel("GST Number (GSTIN)");
    if (await gstInput.isVisible()) {
      await gstInput.fill("27AAACG1234F1Z5"); // Valid 15-char GSTIN
    }

    // Advance to Section 2: Contact
    await page.getByRole("button", { name: /Next: Contact Details/i }).click();
    await page.getByLabel("Email Address").fill(`billing@apex-${runId}.com`);

    // Advance to Section 3: Banking Details
    await page.getByRole("button", { name: /Next: Banking Details/i }).click();
    await page.getByLabel("Bank Name").fill("HDFC Bank Ltd");
    await page.getByLabel("Account Number").fill(bankAccountNum);
    const ifscInput = page.getByLabel("IFSC Code / Routing Code");
    if (await ifscInput.isVisible()) {
      await ifscInput.fill("HDFC0001234");
    }

    // Submit supplier onboarding
    await page.getByRole("button", { name: /Save & Onboard Supplier/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });

    // Verify supplier appears in directory
    await expect(page.getByText(supplierName).first()).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // Stage 2: Create Purchase Order & Physical Goods Receipt Note (GRN)
    // -------------------------------------------------------------------------
    await page.goto("/purchase-orders");
    await expect(page.getByRole("heading", { name: "Purchase Orders" })).toBeVisible();

    // Open Create Purchase Order Modal
    await page.getByRole("button", { name: /Create Purchase Order/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Fill PO master info
    await page.locator("#po-number-input, input[placeholder*='PO-']").first().fill(poNumber);

    // Select onboarded supplier
    const supplierDropdown = page.locator("#po-supplier-select, select[name='supplierId']").first();
    if (await supplierDropdown.isVisible()) {
      await supplierDropdown.selectOption({ label: supplierName }).catch(async () => {
        await supplierDropdown.selectOption({ index: 1 });
      });
    }

    // Set line item
    const lineDescInput = page.locator("input[placeholder*='Description'], input[name*='description']").first();
    if (await lineDescInput.isVisible()) {
      await lineDescInput.fill("Logistics Fleet Equipment");
    }
    const qtyInput = page.locator("input[type='number'][placeholder*='Qty'], input[name*='quantity']").first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill("100");
    }
    const priceInput = page.locator("input[type='number'][placeholder*='Price'], input[name*='unitPrice']").first();
    if (await priceInput.isVisible()) {
      await priceInput.fill("500");
    }

    // Submit PO creation
    const savePoBtn = page.getByRole("button", { name: /Create PO|Save Purchase Order|Confirm PO/i }).first();
    await savePoBtn.click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });

    // Verify PO listed in table and click row to open detail sheet
    const poRow = page.getByText(poNumber).first();
    await expect(poRow).toBeVisible({ timeout: 10000 });
    await poRow.click();

    // Record Physical GRN Intake
    const recordGrnBtn = page.getByRole("button", { name: /Record Goods Receipt|Record First GRN Intake/i }).first();
    if (await recordGrnBtn.isVisible()) {
      await recordGrnBtn.click();
      await expect(page.getByText("Record Goods Receipt Note")).toBeVisible({ timeout: 5000 });

      const delNoteInput = page.locator("input[placeholder*='DC-'], input[name*='vendorDeliveryNote']").first();
      if (await delNoteInput.isVisible()) {
        await delNoteInput.fill(`DC-${runId}`);
      }

      const postGrnBtn = page.getByRole("button", { name: /Post GRN|Record Intake|Confirm/i }).first();
      await postGrnBtn.click();
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    }

    // Close PO drawer if open
    await page.keyboard.press("Escape");

    // -------------------------------------------------------------------------
    // Stage 3: Invoice Intake & Extraction Review
    // -------------------------------------------------------------------------
    await page.goto("/inbox");
    await expect(page.locator("h1")).toHaveText("Inbox", { timeout: 15000 });

    // Open Quick manual entry drawer
    await page.getByRole("button", { name: /Quick manual entry/i }).click();
    await page.fill("#shared-invoice-number", invoiceNumber);

    const invoiceSupplierTrigger = page.locator("#shared-invoice-supplier");
    if (await invoiceSupplierTrigger.isVisible()) {
      await invoiceSupplierTrigger.click();
      const option = page.getByRole("option", { name: new RegExp(supplierName, "i") }).first();
      if (await option.isVisible()) {
        await option.click();
      } else {
        await page.getByRole("option").nth(1).click();
      }
    }

    // Enter line matching PO
    const lineDesc = page.locator('input[placeholder*="Item description"]').first();
    if (await lineDesc.isVisible()) {
      await lineDesc.fill("Logistics Fleet Equipment");
    }
    const lineQty = page.locator('input[aria-label*="quantity"], input[placeholder*="Qty"]').first();
    if (await lineQty.isVisible()) {
      await lineQty.fill("100");
    }
    const lineRate = page.locator('input[aria-label*="unit price"]').first();
    if (await lineRate.isVisible()) {
      await lineRate.fill("500");
    }
    const amountInput = page.getByLabel("Amount printed on invoice");
    if (await amountInput.isVisible()) {
      await amountInput.fill("50000");
    }

    // Submit invoice
    await page.click('button[type="submit"]');

    // Verify invoice in Recent Invoices list and navigate to detail page
    await expect(page.getByText(invoiceNumber, { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await page.getByText(invoiceNumber, { exact: true }).first().click();

    const openWorkspaceBtn = page.getByRole("button", { name: /Open Full Workspace/i });
    await expect(openWorkspaceBtn).toBeVisible({ timeout: 10000 });
    await openWorkspaceBtn.click();

    await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);
    await expect(page.locator("h1")).toContainText(invoiceNumber);

    // Assert initial invoice status projection: Received (Stage 1)
    await expect(page.getByText(/Received/i).first()).toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------------------
    // Stage 4: Run Capture, Validation & 3-Way Matching
    // -------------------------------------------------------------------------
    const runCaptureBtn = page.getByRole("button", { name: /Run Capture & Validation/i }).first();
    await expect(runCaptureBtn).toBeVisible();
    await runCaptureBtn.click();

    // After processing, invoice advances past RECEIVED to MATCHED/PROCESSING
    await expect(page.getByRole("button", { name: /Run Capture & Validation/i })).not.toBeVisible({ timeout: 15000 });

    // Click "Send to Approval" primary action CTA
    const sendToApprovalBtn = page.getByRole("button", { name: /Send to Approval/i }).first();
    if (await sendToApprovalBtn.isVisible({ timeout: 5000 })) {
      await sendToApprovalBtn.click();
    }

    // Assert invoice state is now PENDING_APPROVAL
    await expect(page.getByText(/Ready for Management Approval|Pending Approval|Waiting Approval/i).first()).toBeVisible({
      timeout: 15000,
    });

    // -------------------------------------------------------------------------
    // Stage 5: Segregation of Duties — Second User Approval (Finance Manager)
    // -------------------------------------------------------------------------
    // Log in as Finance Manager (approver persona) to sign off
    await loginAs(page, SEEDED_ACCOUNTS.manager);
    await page.goto("/approvals");
    await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible({ timeout: 15000 });

    // Locate the invoice in approvals queue
    const approvalRow = page.getByText(invoiceNumber).first();
    await expect(approvalRow).toBeVisible({ timeout: 10000 });
    await approvalRow.click();

    // Authorize invoice approval
    const approveBtn = page.getByRole("button", { name: /Approve Invoice|Authorize/i }).first();
    await expect(approveBtn).toBeVisible({ timeout: 10000 });
    await approveBtn.click();

    // Confirm dialog if shown
    const confirmDialogBtn = page.getByRole("dialog").getByRole("button", { name: /Approve|Confirm/i }).first();
    if (await confirmDialogBtn.isVisible({ timeout: 3000 })) {
      await confirmDialogBtn.click();
    }

    // -------------------------------------------------------------------------
    // Stage 6: Payments Workspace — Schedule & Execute Disbursement with UTR
    // -------------------------------------------------------------------------
    await page.goto("/payments");
    await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible({ timeout: 15000 });

    // Search and locate invoice payment row
    const paymentRow = page.locator("tr").filter({ hasText: invoiceNumber }).first();
    await expect(paymentRow).toBeVisible({ timeout: 10000 });

    // Click Execute on the payment row
    const executePaymentBtn = paymentRow.getByRole("button", { name: /Execute/i }).first();
    await expect(executePaymentBtn).toBeVisible({ timeout: 10000 });
    await executePaymentBtn.click();

    // Banking Disbursement Modal opens
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Authorize Payment Execution/i)).toBeVisible();

    // Fill Bank UTR Transaction Reference Number
    const utrInput = page.locator("#disbursement-utr-input");
    await expect(utrInput).toBeVisible({ timeout: 5000 });
    await utrInput.fill(utrNumber);

    // Confirm execution
    const confirmDisburseBtn = page.getByRole("button", { name: /Execute Payment/i });
    await expect(confirmDisburseBtn).toBeEnabled({ timeout: 5000 });
    await confirmDisburseBtn.click();

    // Assert server-confirmed execution receipt
    await expect(page.getByText(/Payment Execution Recorded|Payment Confirmed/i)).toBeVisible({ timeout: 15000 });
    await page.keyboard.press("Escape");

    // Assert payment status updated to Disbursed / Paid
    await page.goto("/payments");
    const updatedPaymentRow = page.locator("tr").filter({ hasText: invoiceNumber }).first();
    await expect(updatedPaymentRow.getByText(/Disbursed|PAID/i)).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // Stage 7: General Ledger ERP Sync
    // -------------------------------------------------------------------------
    // Navigate back to the invoice detail page
    await page.goto("/invoices");
    await page.getByRole("link", { name: invoiceNumber }).first().click();
    await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);

    // Assert status is now PAID
    await expect(page.getByText(/Payment Executed & Settled|PAID/i).first()).toBeVisible({ timeout: 10000 });

    // Trigger ERP Sync modal
    const syncErpBtn = page.getByRole("button", { name: /Sync to ERP/i }).first();
    await expect(syncErpBtn).toBeVisible({ timeout: 10000 });
    await syncErpBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/ERP Synchronization|Double-Entry/i)).toBeVisible();

    // Post voucher to ERP
    const postVoucherBtn = page.getByRole("button", { name: /Post to/i }).first();
    await expect(postVoucherBtn).toBeVisible();
    await postVoucherBtn.click();

    // Verify successful sync confirmation
    await expect(page.getByText(/General Ledger Synced|Voucher Posted/i)).toBeVisible({ timeout: 15000 });
    await page.keyboard.press("Escape");

    // -------------------------------------------------------------------------
    // Stage 8: Archive Invoice to Compliance Vault
    // -------------------------------------------------------------------------
    // Re-query detail page; primary action is now Archive Invoice
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const archiveBtn = page.getByRole("button", { name: /Archive/i }).first();
    await expect(archiveBtn).toBeVisible({ timeout: 10000 });
    await archiveBtn.click();

    // Confirm archive dialog
    const confirmArchiveBtn = page.getByRole("dialog").getByRole("button", { name: /Archive/i }).first();
    await expect(confirmArchiveBtn).toBeVisible({ timeout: 5000 });
    await confirmArchiveBtn.click();

    // Verify invoice is archived
    await expect(page.getByText(/Archived|Compliance Archive Vault/i).first()).toBeVisible({ timeout: 15000 });

    // Navigate to Archive workspace and assert presence
    await page.goto("/archive");
    await expect(page.getByRole("heading", { name: "Archive" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(invoiceNumber).first()).toBeVisible({ timeout: 10000 });
  });
});
