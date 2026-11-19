import { describe, it, expect } from "vitest";
import {
  normalizeInvoiceNumber,
  parseGstr2bJson,
  parseGstr2bCsv,
  reconcileGstr2b,
  Gstr2bRecord,
} from "./gstr2b";

describe("GSTR-2B Reconciliation & ITC Matching (T-503)", () => {
  describe("normalizeInvoiceNumber", () => {
    it("normalizes variations of invoice numbers consistently", () => {
      expect(normalizeInvoiceNumber("INV/2026/001")).toBe("INV2026001");
      expect(normalizeInvoiceNumber("inv-2026-001")).toBe("INV2026001");
      expect(normalizeInvoiceNumber("  INV 2026 001  ")).toBe("INV2026001");
      expect(normalizeInvoiceNumber("INV/0042")).toBe("INV0042");
      expect(normalizeInvoiceNumber("000123")).toBe("123");
      expect(normalizeInvoiceNumber("")).toBe("");
      expect(normalizeInvoiceNumber(null)).toBe("");
    });
  });

  describe("parseGstr2bJson", () => {
    it("parses standard GSTN GSTR-2B JSON structure with nested b2b/inv/items", () => {
      const mockGstrJson = {
        data: {
          b2b: [
            {
              ctin: "29AABCU9603R1ZJ",
              trdNm: "Tata Steel Limited",
              inv: [
                {
                  inum: "INV-TS-101",
                  idt: "15-05-2026",
                  val: 118000,
                  itcavl: "Y",
                  items: [
                    {
                      txval: 100000,
                      iamt: 18000,
                      camt: 0,
                      samt: 0,
                      csamt: 0,
                    },
                  ],
                },
                {
                  inum: "INV-TS-102",
                  idt: "20-05-2026",
                  val: 59000,
                  itcavl: "N", // Ineligible ITC
                  items: [
                    {
                      txval: 50000,
                      iamt: 9000,
                      camt: 0,
                      samt: 0,
                      csamt: 0,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const records = parseGstr2bJson(mockGstrJson);
      expect(records).toHaveLength(2);

      expect(records[0]).toEqual({
        supplierGstin: "29AABCU9603R1ZJ",
        supplierName: "Tata Steel Limited",
        invoiceNumber: "INV-TS-101",
        invoiceDate: "15-05-2026",
        invoiceValue: 118000,
        taxableAmount: 100000,
        taxAmount: 18000,
        itcEligibility: "Y",
        filingDate: undefined,
        reverseCharge: false,
      });

      expect(records[1].itcEligibility).toBe("N");
      expect(records[1].taxAmount).toBe(9000);
    });
  });

  describe("parseGstr2bCsv", () => {
    it("parses official GST Portal GSTR-2B CSV download", () => {
      const mockCsv = `GSTIN of supplier,Trade/Legal name,Invoice number,Invoice type,Invoice Date,Invoice Value,Place of supply,Reverse Charge,Taxable Value,Integrated Tax,Central Tax,State/UT Tax,Cess,GSTR-1/5 Filing Date,ITC Availability
27AABCL1234F1Z5,Larsen & Toubro Ltd,INV-LT-01,Regular,12-05-2026,236000.00,27-Maharashtra,N,200000.00,0.00,18000.00,18000.00,0.00,14-06-2026,Y
29AABCI5678K1Z2,Infosys Ltd,INF-999,Regular,14-05-2026,11800.00,29-Karnataka,N,10000.00,1800.00,0.00,0.00,0.00,14-06-2026,Y`;

      const records = parseGstr2bCsv(mockCsv);
      expect(records).toHaveLength(2);

      expect(records[0].supplierGstin).toBe("27AABCL1234F1Z5");
      expect(records[0].supplierName).toBe("Larsen & Toubro Ltd");
      expect(records[0].invoiceNumber).toBe("INV-LT-01");
      expect(records[0].invoiceValue).toBe(236000);
      expect(records[0].taxAmount).toBe(36000); // 18000 + 18000
      expect(records[0].itcEligibility).toBe("Y");

      expect(records[1].supplierGstin).toBe("29AABCI5678K1Z2");
      expect(records[1].invoiceNumber).toBe("INF-999");
      expect(records[1].taxAmount).toBe(1800);
    });
  });

  describe("reconcileGstr2b", () => {
    it("correctly reconciles matched, tax mismatch, missing in GSTR-2B, and missing in books", () => {
      const booksInvoices = [
        {
          id: "inv-1",
          invoiceNumber: "INV/2026/001", // Normalized matches "INV2026001"
          supplierGstin: "29AABCU9603R1ZJ",
          supplierName: "Alpha Corp",
          taxAmount: 18000.0,
          totalAmount: 118000.0,
        },
        {
          id: "inv-2",
          invoiceNumber: "INV-VAR-002",
          supplierGstin: "27AABCL1234F1Z5",
          supplierName: "Beta Ltd",
          taxAmount: 36000.0, // Books report 36000, GSTR-2B reports 32000 (diff 4000)
          totalAmount: 236000.0,
        },
        {
          id: "inv-3",
          invoiceNumber: "INV-MISSING-003",
          supplierGstin: "33AABCT9999M1Z1",
          supplierName: "Gamma Inc",
          taxAmount: 5000.0, // Missing in GSTR-2B -> Blocked ITC
          totalAmount: 35000.0,
        },
      ];

      const gstr2bRecords: Gstr2bRecord[] = [
        {
          supplierGstin: "29AABCU9603R1ZJ",
          supplierName: "Alpha Corp",
          invoiceNumber: "INV2026001", // Match with inv-1
          invoiceValue: 118000.0,
          taxableAmount: 100000.0,
          taxAmount: 18000.5, // 0.50 difference <= 1.0 tolerance
          itcEligibility: "Y",
        },
        {
          supplierGstin: "27AABCL1234F1Z5",
          supplierName: "Beta Ltd",
          invoiceNumber: "INV-VAR-002", // Match with inv-2, but variance
          invoiceValue: 232000.0,
          taxableAmount: 200000.0,
          taxAmount: 32000.0,
          itcEligibility: "Y",
        },
        {
          supplierGstin: "07AABCE8888D1Z9",
          supplierName: "Delta Tech",
          invoiceNumber: "DEL-777", // Missing in books
          invoiceValue: 59000.0,
          taxableAmount: 50000.0,
          taxAmount: 9000.0,
          itcEligibility: "Y",
        },
      ];

      const summary = reconcileGstr2b(booksInvoices, gstr2bRecords, 1.0);

      // Verify overall counts
      expect(summary.totalBooksInvoices).toBe(3);
      expect(summary.totalGstr2bRecords).toBe(3);
      expect(summary.matchedCount).toBe(1);
      expect(summary.taxMismatchCount).toBe(1);
      expect(summary.missingInGstr2bCount).toBe(1);
      expect(summary.missingInBooksCount).toBe(1);

      // Verify Eligible vs Blocked ITC
      expect(summary.matchedEligibleItc).toBe(18000); // inv-1 eligible
      expect(summary.taxMismatchDiscrepancy).toBe(4000); // 36000 - 32000
      expect(summary.missingInGstr2bBlockedItc).toBe(5000); // inv-3 blocked

      // Verify detail records
      const match1 = summary.results.find((r) => r.booksInvoiceId === "inv-1");
      expect(match1?.status).toBe("MATCHED");
      expect(match1?.itcStatus).toBe("ELIGIBLE");

      const match2 = summary.results.find((r) => r.booksInvoiceId === "inv-2");
      expect(match2?.status).toBe("TAX_MISMATCH");
      expect(match2?.itcStatus).toBe("RESTRICTED");
      expect(match2?.taxDifference).toBe(4000);

      const match3 = summary.results.find((r) => r.booksInvoiceId === "inv-3");
      expect(match3?.status).toBe("MISSING_IN_GSTR2B");
      expect(match3?.itcStatus).toBe("BLOCKED");

      const matchUnrecorded = summary.results.find((r) => r.status === "MISSING_IN_BOOKS");
      expect(matchUnrecorded?.invoiceNumber).toBe("DEL-777");
      expect(matchUnrecorded?.supplierGstin).toBe("07AABCE8888D1Z9");
    });
  });
});
