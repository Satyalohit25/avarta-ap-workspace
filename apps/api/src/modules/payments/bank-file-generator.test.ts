import { describe, it, expect } from "vitest";
import {
  calculateRoutingCheckDigit,
  generateNachaFile,
  generateBankCsv,
  validateIndianIfsc,
  generateIndianNeftRtgsCsv,
  generateHdfcBulkFile,
  generateIciciBulkFile,
  generateSbiBulkFile,
  BankPaymentRecord,
} from "./bank-file-generator";

describe("Bank File Generator - T-309 Bank File Formats (NACHA & Indian Formats)", () => {
  describe("NACHA Format & Algorithmic Invariants", () => {
    it("calculates correct routing check digit using Mod 10 weighting (3, 7, 1)", () => {
      // Fed routing: 12100035 -> 8
      expect(calculateRoutingCheckDigit("12100035")).toBe(8);
      // Fed routing: 02100002 -> 1
      expect(calculateRoutingCheckDigit("02100002")).toBe(1);
      // Chase routing: 02100002 -> 1
      expect(calculateRoutingCheckDigit("02100002")).toBe(1);
      // Wells Fargo: 12100024 -> 8 (3*1 + 7*2 + 1*1 + 3*0 + 7*0 + 1*0 + 3*2 + 7*4 = 3 + 14 + 1 + 6 + 28 = 52 -> 10 - 2 = 8)
      expect(calculateRoutingCheckDigit("12100024")).toBe(8);
    });

    it("produces valid 94-character fixed-width NACHA records with exact padding and entry hash", () => {
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

      // 1. Every line MUST be exactly 94 characters (Doc 24 C8-4)
      lines.forEach((line) => {
        expect(line.length).toBe(94);
      });

      // 2. Structural record types
      expect(lines[0].startsWith("1")).toBe(true); // File header
      expect(lines[1].startsWith("5")).toBe(true); // Batch header
      expect(lines[2].startsWith("6")).toBe(true); // Detail record 1
      expect(lines[3].startsWith("6")).toBe(true); // Detail record 2
      expect(lines[4].startsWith("8")).toBe(true); // Batch control
      expect(lines[5].startsWith("9")).toBe(true); // File control

      // 3. Blocking factor: total lines must be a multiple of 10, padded with 9s
      expect(lines.length % 10).toBe(0);
      for (let i = 6; i < lines.length; i++) {
        expect(lines[i]).toBe("9".repeat(94));
      }

      // 4. Entry hash verification: sum of 8-digit routing numbers (12100035 + 02100002 = 14200037)
      // Batch control line (record 8) at offset 10..20 should contain 0014200037
      const batchControl = lines[4];
      const entryHash = batchControl.slice(10, 20);
      expect(entryHash).toBe("0014200037");

      // File control line (record 9) at offset 21..31 should also contain 0014200037
      const fileControl = lines[5];
      expect(fileControl.slice(21, 31)).toBe("0014200037");

      // 5. Total credit verification: 1500.50 + 2400.00 = 3900.50 -> 390050 cents
      // Padded to 12 zeros: 000000390050
      expect(batchControl.slice(32, 44)).toBe("000000390050");
      expect(fileControl.slice(43, 55)).toBe("000000390050");
    });
  });

  describe("Indian Bank Format Specs (T-309)", () => {
    it("validates 11-character Indian IFSC codes correctly", () => {
      // Valid IFSCs
      expect(validateIndianIfsc("HDFC0001234")).toBe(true);
      expect(validateIndianIfsc("SBIN0000300")).toBe(true);
      expect(validateIndianIfsc("ICIC0000001")).toBe(true);
      expect(validateIndianIfsc("KKBK0000123")).toBe(true);
      expect(validateIndianIfsc("UTIB0000456")).toBe(true);

      // Invalid IFSCs
      expect(validateIndianIfsc("")).toBe(false);
      expect(validateIndianIfsc("HDFC1234")).toBe(false); // too short
      expect(validateIndianIfsc("HDFC1001234")).toBe(false); // 5th char not '0'
      expect(validateIndianIfsc("12340001234")).toBe(false); // first 4 must be letters
      expect(validateIndianIfsc("HDFC00012345")).toBe(false); // 12 chars
      expect(validateIndianIfsc("HDFC-001234")).toBe(false); // hyphen
    });

    it("generates universal Indian NEFT/RTGS CSV with threshold-based routing", () => {
      const records: BankPaymentRecord[] = [
        {
          paymentId: "pay-neft",
          amount: 50000, // < 2,00,000 -> NEFT
          currency: "INR",
          beneficiaryName: "Tata Consultancy Services",
          accountNumber: "501002345678",
          routingNumber: "HDFC0001234",
          invoiceNumber: "INV-TCS-001",
        },
        {
          paymentId: "pay-rtgs",
          amount: 250000, // >= 2,00,000 -> RTGS
          currency: "INR",
          beneficiaryName: "Larsen & Toubro Ltd",
          accountNumber: "987654321012",
          routingNumber: "ICIC0000001",
          invoiceNumber: "INV-LT-002",
        },
      ];

      const csv = generateIndianNeftRtgsCsv(records, "DEBIT-9999");
      const lines = csv.split("\r\n");

      expect(lines[0]).toBe(
        "TransactionType,BeneficiaryAccountNumber,BeneficiaryName,IFSC,Amount,DebitAccountNumber,PaymentReference,InvoiceNumber,Date,Remarks"
      );
      expect(lines[1]).toContain("NEFT");
      expect(lines[1]).toContain('"501002345678"');
      expect(lines[1]).toContain('"HDFC0001234"');
      expect(lines[1]).toContain("50000.00");

      expect(lines[2]).toContain("RTGS");
      expect(lines[2]).toContain('"987654321012"');
      expect(lines[2]).toContain('"ICIC0000001"');
      expect(lines[2]).toContain("250000.00");
    });

    it("generates HDFC E-Net bulk file with IFT, RTGS, and NEFT classification", () => {
      const records: BankPaymentRecord[] = [
        {
          paymentId: "pay-hdfc-ift",
          amount: 150000,
          currency: "INR",
          beneficiaryName: "HDFC Vendor Corp",
          accountNumber: "50200011223344",
          routingNumber: "HDFC0000050", // HDFC to HDFC -> IFT
          invoiceNumber: "INV-HDFC-1",
        },
        {
          paymentId: "pay-hdfc-rtgs",
          amount: 300000,
          currency: "INR",
          beneficiaryName: "State Supplier",
          accountNumber: "201000998877",
          routingNumber: "SBIN0000300", // Non-HDFC >= 200,000 -> RTGS
          invoiceNumber: "INV-SBI-2",
        },
        {
          paymentId: "pay-hdfc-neft",
          amount: 25000,
          currency: "INR",
          beneficiaryName: "Axis Parts Ltd",
          accountNumber: "912000554433",
          routingNumber: "UTIB0000100", // Non-HDFC < 200,000 -> NEFT
          invoiceNumber: "INV-AXIS-3",
        },
      ];

      const csv = generateHdfcBulkFile(records, "CORP-HDFC-ACCT");
      const lines = csv.split("\r\n");

      expect(lines[0]).toBe(
        "Transaction Type,Beneficiary Account Number,Amount,Beneficiary Name,IFSC,Sender Account Number,Customer Reference Number,Narration"
      );
      expect(lines[1].startsWith("IFT")).toBe(true);
      expect(lines[2].startsWith("RTGS")).toBe(true);
      expect(lines[3].startsWith("NEFT")).toBe(true);
    });

    it("generates ICICI CIB bulk file with Internal (I), RTGS (R), and NEFT (N) codes", () => {
      const records: BankPaymentRecord[] = [
        {
          paymentId: "pay-icici-i",
          amount: 75000,
          currency: "INR",
          beneficiaryName: "ICICI Beneficiary",
          accountNumber: "000405001234",
          routingNumber: "ICIC0000004", // ICICI to ICICI -> I
          invoiceNumber: "INV-IC-1",
        },
        {
          paymentId: "pay-icici-r",
          amount: 500000,
          currency: "INR",
          beneficiaryName: "Mega Infra Ltd",
          accountNumber: "112233445566",
          routingNumber: "HDFC0001234", // Non-ICICI >= 200,000 -> R
          invoiceNumber: "INV-MI-2",
        },
        {
          paymentId: "pay-icici-n",
          amount: 45000,
          currency: "INR",
          beneficiaryName: "Local Vendor",
          accountNumber: "334455667788",
          routingNumber: "SBIN0000100", // Non-ICICI < 200,000 -> N
          invoiceNumber: "INV-LV-3",
        },
      ];

      const csv = generateIciciBulkFile(records, "ICICI-DEBIT-01");
      const lines = csv.split("\r\n");

      expect(lines[0]).toBe(
        "PaymentMode,DebitAccountNumber,BeneficiaryAccountNumber,Amount,BeneficiaryName,BeneficiaryIFSC,UserReference,Remarks"
      );
      expect(lines[1].startsWith("I")).toBe(true);
      expect(lines[2].startsWith("R")).toBe(true);
      expect(lines[3].startsWith("N")).toBe(true);
    });

    it("generates SBI CMP bulk file with TRANSFER, RTGS, and NEFT codes", () => {
      const records: BankPaymentRecord[] = [
        {
          paymentId: "pay-sbi-xfer",
          amount: 80000,
          currency: "INR",
          beneficiaryName: "SBI Sister Org",
          accountNumber: "30001234567",
          routingNumber: "SBIN0001234", // SBI to SBI -> TRANSFER
          invoiceNumber: "INV-SBI-1",
        },
        {
          paymentId: "pay-sbi-rtgs",
          amount: 220000,
          currency: "INR",
          beneficiaryName: "Heavy Machinery Co",
          accountNumber: "501001234567",
          routingNumber: "HDFC0000010", // Non-SBI >= 200,000 -> RTGS
          invoiceNumber: "INV-HM-2",
        },
        {
          paymentId: "pay-sbi-neft",
          amount: 15000,
          currency: "INR",
          beneficiaryName: "Micro Supplies",
          accountNumber: "000501234567",
          routingNumber: "ICIC0000010", // Non-SBI < 200,000 -> NEFT
          invoiceNumber: "INV-MS-3",
        },
      ];

      const csv = generateSbiBulkFile(records, "SBI-CURRENT-01");
      const lines = csv.split("\r\n");

      expect(lines[0]).toBe(
        "PaymentType,DebitAccount,BeneficiaryAccount,BeneficiaryName,Amount,IFSC,PaymentReference,Remarks"
      );
      expect(lines[1].startsWith("TRANSFER")).toBe(true);
      expect(lines[2].startsWith("RTGS")).toBe(true);
      expect(lines[3].startsWith("NEFT")).toBe(true);
    });

    it("generates generic corporate CSV format", () => {
      const records: BankPaymentRecord[] = [
        {
          paymentId: "pay-generic",
          amount: 12500,
          currency: "INR",
          beneficiaryName: "Generic Vendor",
          accountNumber: "11223344",
          routingNumber: "HDFC0001234",
          invoiceNumber: "INV-GEN-1",
        },
      ];
      const csv = generateBankCsv(records);
      expect(csv).toContain("PaymentReference,InvoiceNumber,BeneficiaryName,AccountNumber,IFSC_Or_Routing,Amount,Currency,DueDate");
      expect(csv).toContain('"pay-generic"');
      expect(csv).toContain("12500.00");
    });
  });
});
