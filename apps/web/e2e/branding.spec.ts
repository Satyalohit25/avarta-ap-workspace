import { test, expect } from '@playwright/test';

test.describe('Avarta Brand & Identity Verification', () => {
  test('verifies Avarta title, favicon links, and Old English header', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Document Title assertion
    await expect(page).toHaveTitle(/Avarta/);

    // Favicon links assertion
    const svgIcon = page.locator('link[rel="icon"][type="image/svg+xml"]');
    await expect(svgIcon).toHaveAttribute('href', '/favicon.svg');

    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveAttribute('href', '/apple-touch-icon.png');

    // Login and verify app workspace header
    await page.fill('#loginEmail', 'manager@avarta.dev');
    await page.fill('#loginPassword', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/overview/);

    // Verify Avarta wordmark and subtitle in sidebar
    await expect(page.locator('aside')).toContainText('Avarta');
    await expect(page.locator('aside')).toContainText(/Accounts Payable Workspace/i);
  });

  test('verifies invoice detail page has consolidated audit drawer and no bottom duplicate card', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('#loginEmail', 'manager@avarta.dev');
    await page.fill('#loginPassword', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/overview/);

    // Navigate to invoices and click first invoice
    await page.goto('/invoices');
    await page.waitForLoadState('domcontentloaded');
    const firstInvoice = page.locator('table tbody tr').first();
    await firstInvoice.click();
    await page.waitForURL(/\/invoices\/.+/);

    // Verify redundant bottom card is removed
    const bottomAuditCard = page.locator('#invoice-audit-section');
    await expect(bottomAuditCard).toHaveCount(0);

    // Verify top-right audit button exists and opens drawer
    const auditBtn = page.getByRole('button', { name: /Audit History/i });
    await expect(auditBtn).toBeVisible();
    await auditBtn.click();

    // Verify slide-out drawer appears with timeline and NO SOC2 banner
    await expect(page.getByRole('heading', { name: /Audit Trail/i })).toBeVisible();
    await expect(page.getByText('SOC2 Type II')).toHaveCount(0);

    // Verify there are no duplicate audit buttons in the header
    await expect(page.getByRole('button', { name: /^View Audit Trail$/i })).toHaveCount(0);

    // Save screenshot of clean audit drawer
    await page.waitForTimeout(600);
    await page.screenshot({
      path: 'C:/Users/lohit/.gemini/antigravity-ide/brain/6e360243-5347-4196-895e-dd16767a8b6d/clean-audit-drawer.png',
      fullPage: false,
    });
  });
});
