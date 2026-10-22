import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loginAs, SEEDED_ACCOUNTS } from "./helpers/auth";

const dbUrl =
  process.env.DATABASE_URL && process.env.DATABASE_URL.includes("schema=test_suite")
    ? process.env.DATABASE_URL
    : "postgresql://postgres:123456@127.0.0.1:5432/avarta_db?schema=test_suite";

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

test.describe("Day 1.5 Item 8: Solo Administrator Segregation of Duties Override", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("shows override option in single-admin org, hides it in dual-admin org, and rejects direct API call with 403", async ({
    page,
  }) => {
    // 1. Login as primary Administrator
    await loginAs(page, SEEDED_ACCOUNTS.admin);

    // Retrieve active administrator user record from database
    const adminUser = await prisma.user.findFirst({
      where: { email: SEEDED_ACCOUNTS.admin.email },
    });
    expect(adminUser).not.toBeNull();
    const orgId = adminUser!.organizationId;

    // 2. Locate or prepare an invoice in WAITING_APPROVAL state
    let targetInvoice = await prisma.invoice.findFirst({
      where: {
        organizationId: orgId,
        workflowState: "WAITING_APPROVAL",
      },
    });

    if (!targetInvoice) {
      targetInvoice = await prisma.invoice.create({
        data: {
          organizationId: orgId,
          invoiceNumber: `INV-SOD-${Date.now().toString().slice(-6)}`,
          totalAmount: 50000,
          currency: "INR",
          workflowState: "WAITING_APPROVAL",
          status: "PENDING_APPROVAL",
        },
      });
      await prisma.workflowInstance.create({
        data: {
          invoiceId: targetInvoice.id,
          currentState: "WAITING_APPROVAL",
        },
      });
    }

    // Explicitly link invoice creation to this administrator so Segregation of Duties applies
    await prisma.auditLog.deleteMany({
      where: {
        entityId: targetInvoice.id,
        action: { in: ["INVOICE_CREATED", "DOCUMENT_UPLOADED"] },
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        entityId: targetInvoice.id,
        action: "INVOICE_CREATED",
        entityType: "INVOICE",
        userId: adminUser!.id,
      },
    });

    // Navigate to the invoice workspace
    await page.goto(`/invoices/${targetInvoice.id}`);
    await expect(page.locator("h1")).toContainText(targetInvoice.invoiceNumber, { timeout: 15000 });

    // --- SCENARIO 1: Single-Administrator Organization ---
    // Open the approval dialog
    const approveBtn = page.getByRole("button", { name: "Approve Invoice", exact: true });
    await expect(approveBtn).toBeVisible({ timeout: 10000 });
    await approveBtn.click();

    // In a single-admin org, the "Solo Administrator Override" checkbox MUST be visible
    const overrideLabel = page.getByText("Solo Administrator Override");
    await expect(overrideLabel).toBeVisible({ timeout: 5000 });

    // Checking the override should reveal the justification input (10+ characters)
    await overrideLabel.click();
    await expect(
      page.getByText(/Override Justification \(10\+ characters\) \*/i)
    ).toBeVisible();

    // Dismiss the dialog
    await page.keyboard.press("Escape");

    // --- SCENARIO 2: Dual-Administrator Organization ---
    // Create a second active administrator in the database
    const secondAdminEmail = `admin2_${Date.now()}@avarta.dev`;
    const secondAdmin = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: secondAdminEmail,
        fullName: "Secondary Admin User",
        passwordHash: "dummyHash",
        role: "ADMINISTRATOR",
        status: "ACTIVE",
      },
    });

    try {
      // Reload page so AuthContext restores session with activeAdminCount = 2, isSoloAdmin = false
      await page.reload();
      await expect(page.locator("h1")).toContainText(targetInvoice.invoiceNumber, { timeout: 10000 });

      // Click "Approve Invoice" again
      await page.getByRole("button", { name: "Approve Invoice", exact: true }).click();

      // In a dual-admin org, the "Solo Administrator Override" option MUST NOT be shown
      await expect(page.getByText("Solo Administrator Override")).toHaveCount(0);

      // Dismiss dialog
      await page.keyboard.press("Escape");

      // Direct API call attempting override in a 2-admin org MUST return 403 Forbidden
      const directApiResult = await page.evaluate(async ({ id }) => {
        const res = await fetch(`/api/v1/invoices/${id}/transitions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("avarta_token")}`,
          },
          body: JSON.stringify({
            action: "APPROVE",
            overrideSoloAdmin: true,
            overrideReason: "Attempting unauthorized override in dual admin organization",
          }),
        });
        return { status: res.status, json: await res.json() };
      }, { id: targetInvoice.id });

      expect(directApiResult.status).toBe(403);
      expect(directApiResult.json.error?.message || directApiResult.json.error).toMatch(
        /Segregation of Duties override is only permitted for single-administrator organizations/i
      );
    } finally {
      // Cleanup: Delete second admin to restore single-admin state for subsequent tests
      await prisma.user.delete({
        where: { id: secondAdmin.id },
      });
    }
  });
});
