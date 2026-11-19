import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/database";
import { exportDataset, csvCell } from "./service";

const ORG_A = "org-export-test-a";
const ORG_B = "org-export-test-b";
const USER_A = "user-export-test-a";
const USER_B = "user-export-test-b";
const SUPPLIER_A = "sup-export-test-a";
const SUPPLIER_B = "sup-export-test-b";
const INVOICE_A = "inv-export-test-a";
const INVOICE_B = "inv-export-test-b";
const PAYMENT_A = "pay-export-test-a";

async function seed() {
  await prisma.payment.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
  await prisma.invoice.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
  await prisma.supplier.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
  await prisma.auditLog.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
  await prisma.user.deleteMany({ where: { id: { in: [USER_A, USER_B] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [ORG_A, ORG_B] } } });

  await prisma.organization.createMany({
    data: [
      { id: ORG_A, name: "Export Test A", defaultCurrency: "INR", country: "IN" },
      { id: ORG_B, name: "Export Test B", defaultCurrency: "INR", country: "IN" },
    ],
  });
  await prisma.user.createMany({
    data: [
      {
        id: USER_A,
        organizationId: ORG_A,
        email: "admin@export-test.example",
        passwordHash: "x",
        fullName: "Export Admin",
        role: "ADMINISTRATOR",
      },
      {
        id: USER_B,
        organizationId: ORG_B,
        email: "admin@export-other.example",
        passwordHash: "x",
        fullName: "Other Admin",
        role: "ADMINISTRATOR",
      },
    ],
  });
  await prisma.supplier.createMany({
    data: [
      {
        id: SUPPLIER_A,
        organizationId: ORG_A,
        supplierCode: "SUP-A",
        legalName: "Acme Supplies Private Limited",
        displayName: "Acme Supplies",
        gstNumber: "27AAACA1234F1Z5",
        country: "IN",
        currency: "INR",
      },
      {
        id: SUPPLIER_B,
        organizationId: ORG_B,
        supplierCode: "SUP-B",
        legalName: "Other Tenant Supplier",
        displayName: "Other Tenant",
        country: "IN",
        currency: "INR",
      },
    ],
  });
  await prisma.invoice.createMany({
    data: [
      {
        id: INVOICE_A,
        organizationId: ORG_A,
        supplierId: SUPPLIER_A,
        invoiceNumber: "INV-EXPORT-1",
        currency: "INR",
        subtotalAmount: "1000.00",
        taxAmount: "180.00",
        totalAmount: "1180.00",
        invoiceDate: new Date("2026-11-01"),
        dueDate: new Date("2026-12-01"),
      },
      {
        id: INVOICE_B,
        organizationId: ORG_B,
        supplierId: SUPPLIER_B,
        invoiceNumber: "INV-OTHER-1",
        currency: "INR",
        subtotalAmount: "5000.00",
        taxAmount: "900.00",
        totalAmount: "5900.00",
      },
    ],
  });
  await prisma.payment.create({
    data: {
      id: PAYMENT_A,
      organizationId: ORG_A,
      invoiceId: INVOICE_A,
      amount: "1180.00",
      currency: "INR",
      paymentMethod: "BANK_TRANSFER",
      status: "PAID",
      utrNumber: "UTR1234567890",
      settlementDate: new Date("2026-11-05"),
      processedAt: new Date("2026-11-05"),
      beneficiaryName: "Acme Supplies",
    },
  });
}

describe("Workspace data export", () => {
  beforeEach(seed);

  it("exports a tenant's invoice register as CSV with headers and values", async () => {
    const result = await exportDataset(ORG_A, USER_A, "invoices");

    expect(result.dataset).toBe("invoices");
    expect(result.rowCount).toBe(1);
    expect(result.filename).toMatch(/^avarta-invoices-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(result.csv).toContain("invoiceNumber");
    expect(result.csv).toContain("INV-EXPORT-1");
    expect(result.csv).toContain("Acme Supplies");
    expect(result.csv).toContain("1180");
    // Another tenant's invoice must never leak into the export.
    expect(result.csv).not.toContain("INV-OTHER-1");
    expect(result.csv).not.toContain("Other Tenant");
  });

  it("exports suppliers without encrypted account numbers", async () => {
    const result = await exportDataset(ORG_A, USER_A, "suppliers");

    expect(result.rowCount).toBe(1);
    expect(result.csv).toContain("SUP-A");
    expect(result.csv).toContain("Acme Supplies Private Limited");
    expect(result.csv).not.toContain("SUP-B");
    expect(result.csv).not.toContain("encryptedAccountNumber");
  });

  it("exports the payment register with its invoice reference", async () => {
    const result = await exportDataset(ORG_A, USER_A, "payments");

    expect(result.rowCount).toBe(1);
    expect(result.csv).toContain("UTR1234567890");
    expect(result.csv).toContain("INV-EXPORT-1");
    expect(result.csv).toContain("PAID");
  });

  it("writes an audit event for every export", async () => {
    await exportDataset(ORG_A, USER_A, "invoices");

    const audit = await prisma.auditLog.findFirst({
      where: { organizationId: ORG_A, action: "WORKSPACE_DATA_EXPORTED" },
    });
    expect(audit).not.toBeNull();
    expect(audit?.userId).toBe(USER_A);
    expect(audit?.afterData).toMatchObject({ dataset: "invoices", rowCount: 1 });
  });

  it("neutralises spreadsheet formula injection", async () => {
    await prisma.invoice.updateMany({
      where: { id: INVOICE_A, organizationId: ORG_A },
      data: { invoiceNumber: "=HYPERLINK(\"https://evil.example\")" },
    });

    const result = await exportDataset(ORG_A, USER_A, "invoices");
    expect(result.csv).toContain("'=HYPERLINK");
    expect(result.csv).not.toMatch(/\r\n=HYPERLINK/);
  });

  describe("T-207: CSV export sanitizer unit tests", () => {
    it("neutralises formula triggers (=, +, @, \\t, \\r) while keeping negative numbers unquoted/unaltered", () => {
      // Formula triggers must be neutralised with leading apostrophe
      expect(csvCell("=HYPERLINK(A1)")).toBe("'=HYPERLINK(A1)");
      expect(csvCell('=HYPERLINK("https://evil.example")')).toBe('"\'=HYPERLINK(""https://evil.example"")"');
      expect(csvCell("+1+1")).toBe("'+1+1");
      expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
      expect(csvCell("\tcmd.exe")).toBe("'\tcmd.exe");
      expect(csvCell("\rcmd.exe")).toBe('"\'\rcmd.exe"');
      expect(csvCell("-1+1")).toBe("'-1+1");

      // Plain numeric values (including negative numbers) must be unaltered
      expect(csvCell("1234.50")).toBe("1234.50");
      expect(csvCell(1234.5)).toBe("1234.5");
      expect(csvCell("-1234.50")).toBe("-1234.50");
      expect(csvCell(-1234.5)).toBe("-1234.5");
      expect(csvCell("-100")).toBe("-100");
      expect(csvCell(0)).toBe("0");

      // Normal text strings should remain unaltered
      expect(csvCell("INV-2026-001")).toBe("INV-2026-001");
      expect(csvCell("Acme Supplies")).toBe("Acme Supplies");
    });

    it("satisfies RFC 4180 CSV escaping for commas, quotes, and newlines", () => {
      expect(csvCell('Text with "quotes"')).toBe('"Text with ""quotes"""');
      expect(csvCell("Text, with comma")).toBe('"Text, with comma"');
      expect(csvCell("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
      expect(csvCell('Complex: "A", B\nC')).toBe('"Complex: ""A"", B\nC"');
    });

    it("exports dataset with formula injection neutralised and negative/positive amounts preserved", async () => {
      await prisma.invoice.updateMany({
        where: { id: INVOICE_A, organizationId: ORG_A },
        data: {
          invoiceNumber: "+1+1",
          totalAmount: "-1234.50",
          subtotalAmount: "1234.50",
        },
      });

      const result = await exportDataset(ORG_A, USER_A, "invoices");
      expect(result.csv).toContain("'+1+1");
      expect(result.csv).toContain("-1234.5");
      expect(result.csv).toContain("1234.5");
      expect(result.csv).not.toContain("'-1234.5");
    });
  });

  it("returns an empty but valid CSV when the tenant has no records", async () => {
    const emptyOrg = "org-export-test-empty";
    await prisma.organization.deleteMany({ where: { id: emptyOrg } });
    await prisma.organization.create({
      data: { id: emptyOrg, name: "Empty Export Tenant", defaultCurrency: "INR", country: "IN" },
    });

    const result = await exportDataset(emptyOrg, USER_B, "invoices");
    expect(result.rowCount).toBe(0);
    expect(result.csv.trim().replace(/^\uFEFF/, "")).toBe("invoiceNumber,supplierCode,supplierName,invoiceDate,dueDate,currency,subtotalAmount,taxAmount,totalAmount,paidAmount,status,workflowState,source");

    await prisma.auditLog.deleteMany({ where: { organizationId: emptyOrg } });
    await prisma.organization.deleteMany({ where: { id: emptyOrg } });
  });
});
