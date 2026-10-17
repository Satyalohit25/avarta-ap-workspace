import { describe, it, expect } from "vitest";
import {
  calculateRoutingCheckDigit,
  generateNachaFile,
  generateBankCsv,
  BankPaymentRecord,
} from "./bank-file-generator";

describe("Bank File Generator (NACHA & CSV) - C8-4 Acceptance Criteria", () => {
  it("calculates correct routing check digit using Mod 10 weighting", () => {
    // 12100035 -> 8
    expect(calculateRoutingCheckDigit("12100035")).toBe(8);
    // 02100002 -> 1
    expect(calculateRoutingCheckDigit("02100002")).toBe(1);
  });

  it("produces valid 94-character fixed-width NACHA records", () => {
    const records: BankPaymentRecord[] = [
      {
        paymentId: "pay-1",
        amount: 1500.5,
        currency: "USD",
        beneficiaryName: "Acme Industrial Supplies",
        accountNumber: "9876543210",
        routingNumber: "121000358",
        invoiceNumber: "INV-2026-001",
        dueDate: "2026-04-01",
      },
      {
        paymentId: "pay-2",
        amount: 2400.0,
        currency: "USD",
        beneficiaryName: "Tata Chemicals Ltd",
        accountNumber: "1234567890",
        routingNumber: "021000021",
        invoiceNumber: "INV-2026-002",
        dueDate: "2026-04-05",
      },
    ];

    const nachaContent = generateNachaFile("AVARTA CORP", "ORG1234567", records);
    const lines = nachaContent.split("\r\n");

    // Every line MUST be exactly 94 characters (Doc 24 C8-4)
    lines.forEach((line, index) => {
      expect(line.length).toBe(94);
    });

    // File header starts with 1
    expect(lines[0].startsWith("1")).toBe(true);
    // Batch header starts with 5
    expect(lines[1].startsWith("5")).toBe(true);
    // Detail records start with 6
    expect(lines[2].startsWith("6")).toBe(true);
    expect(lines[3].startsWith("6")).toBe(true);
    // Batch control starts with 8
    expect(lines[4].startsWith("8")).toBe(true);
    // File control starts with 9
    expect(lines[5].startsWith("9")).toBe(true);

    // Total block lines must be a multiple of 10
    expect(lines.length % 10).toBe(0);
  });

  it("generates structured CSV with expected headers", () => {
    const records: BankPaymentRecord[] = [
      {
        paymentId: "pay-101",
        amount: 50000,
        currency: "INR",
        beneficiaryName: "Apex Forge Ltd",
        accountNumber: "501002345678",
        routingNumber: "HDFC0001234",
        invoiceNumber: "INV-AF-99",
      },
    ];

    const csv = generateBankCsv(records);
    expect(csv).toContain("PaymentReference,InvoiceNumber,BeneficiaryName,AccountNumber,IFSC_Or_Routing,Amount,Currency,DueDate");
    expect(csv).toContain('"pay-101"');
    expect(csv).toContain('"Apex Forge Ltd"');
    expect(csv).toContain("50000.00");
  });
});
