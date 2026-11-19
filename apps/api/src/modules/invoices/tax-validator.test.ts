import fs from "fs";
import path from "path";
import os from "os";
import { describe, expect, it, vi } from "vitest";
import {
  calculateGstinCheckDigit,
  calculateGstSplit,
  extractGstinStateCode,
  validateGstinChecksum,
  validateTaxArithmetic,
} from "./tax-validator";
import { extractWithHeuristics } from "../../ai/extractor";

describe("Tax ID & Arithmetic Validation (Step 10 & T-107)", () => {
  describe("GSTIN Checksum Verification", () => {
    it("validates legitimate Indian GSTINs with correct Modulo-36 check digits", () => {
      // Tata Consultancy Services Ltd (Maharashtra): 27AAACT2727Q1ZW
      expect(validateGstinChecksum("27AAACT2727Q1ZW")).toBe(true);

      // Verify dynamically with calculated check digit
      const base14 = "29AAACI4390P1Z";
      const checkDigit = calculateGstinCheckDigit(base14);
      expect(checkDigit).toBeTruthy();
      expect(validateGstinChecksum(`${base14}${checkDigit}`)).toBe(true);
    });

    it("rejects invalid GSTINs with wrong check digits", () => {
      // Tampered check digit 'Z' instead of 'W'
      expect(validateGstinChecksum("27AAACT2727Q1ZZ")).toBe(false);
      const base14 = "29AAACI4390P1Z";
      const validCheck = calculateGstinCheckDigit(base14);
      const invalidCheck = validCheck === "0" ? "1" : "0";
      expect(validateGstinChecksum(`${base14}${invalidCheck}`)).toBe(false);
    });

    it("rejects malformed GSTIN inputs", () => {
      expect(validateGstinChecksum("")).toBe(false);
      expect(validateGstinChecksum("12345")).toBe(false);
      expect(validateGstinChecksum("INVALID-GSTIN-FORMAT")).toBe(false);
      expect(validateGstinChecksum("27AAACT2727Q1Z")).toBe(false); // only 14 chars
    });
  });

  describe("Tax Arithmetic Verification", () => {
    it("passes when subtotal + tax equals total", () => {
      const result = validateTaxArithmetic(100000, 18000, 118000);
      expect(result.isValid).toBe(true);
      expect(result.difference).toBe(0);
    });

    it("allows minor rounding differences within tolerance", () => {
      // e.g. 100000 + 18000.40 = 118000.40, billed as 118000 (0.40 rounding)
      const result = validateTaxArithmetic(100000, 18000.4, 118000, 1.0);
      expect(result.isValid).toBe(true);
      expect(result.difference).toBeCloseTo(0.4, 1);
    });

    it("flags discrepancy when tax arithmetic is unbalanced", () => {
      // Subtotal 100,000 + Tax 18,000 = 118,000, but invoice total bills 125,000
      const result = validateTaxArithmetic(100000, 18000, 125000);
      expect(result.isValid).toBe(false);
      expect(result.difference).toBe(7000);
    });

    it("identifies missing subtotal as invalid with missingData flag (T-107)", () => {
      const result = validateTaxArithmetic(null, 18000, 118000);
      expect(result.isValid).toBe(false);
      expect(result.missingData).toBe(true);
    });

    it("identifies missing tax as invalid with missingData flag (T-107)", () => {
      const result = validateTaxArithmetic(100000, null, 118000);
      expect(result.isValid).toBe(false);
      expect(result.missingData).toBe(true);
    });

    it("identifies both missing as invalid with missingData flag (T-107)", () => {
      const result = validateTaxArithmetic(null, null, 118000);
      expect(result.isValid).toBe(false);
      expect(result.missingData).toBe(true);
    });
  });

  describe("T-107: Stop Fabricating Subtotal and Tax (Extraction, Validation & Approval)", () => {
    it("fallback extractor returns null for missing subtotal and tax instead of 85% estimate", () => {
      const tmpFile = path.join(os.tmpdir(), `test-inv-missing-${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, "INVOICE #INV-8899 Date: 2026-09-01 Total Amount: 10,000.00");

      try {
        const result = extractWithHeuristics(tmpFile, "text/plain", "invoice.txt");
        expect(result.totalAmount).toBe(10000);
        expect(result.subtotal).toBeNull();
        expect(result.taxAmount).toBeNull();
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });

    it("fallback extractor extracts subtotal and tax when explicitly present in document", () => {
      const tmpFile = path.join(os.tmpdir(), `test-inv-present-${Date.now()}.txt`);
      fs.writeFileSync(
        tmpFile,
        "INVOICE #INV-8899 Subtotal: 8,500.00 Tax Amount: 1,500.00 Total Amount: 10,000.00"
      );

      try {
        const result = extractWithHeuristics(tmpFile, "text/plain", "invoice.txt");
        expect(result.totalAmount).toBe(10000);
        expect(result.subtotal).toBe(8500);
        expect(result.taxAmount).toBe(1500);
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });

    it("runValidations produces MISSING_TAX_DATA failure when subtotal is null", async () => {
      const { runValidations } = await import("./service");
      const { prisma } = await import("../../config/database");

      vi.spyOn(prisma.invoice, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.validation, "create").mockResolvedValue({} as any);

      const mockInvoice = {
        id: "inv-null-subtotal",
        organizationId: "org-test",
        invoiceNumber: "INV-NULL-SUB",
        totalAmount: 10000 as any,
        subtotalAmount: null,
        taxAmount: 1800 as any,
        supplierId: null,
      };

      const failures = await runValidations("org-test", mockInvoice as any, 95);
      const taxFailure = failures.find((f) => f.ruleCode === "TAX_CALCULATION");

      expect(taxFailure).toBeDefined();
      expect(taxFailure?.exceptionType).toBe("MISSING_TAX_DATA");
      expect(taxFailure?.message).toContain("missing statutory subtotal or tax amount");
    }, 20000);

    it("runValidations produces MISSING_TAX_DATA failure when tax is null", async () => {
      const { runValidations } = await import("./service");
      const { prisma } = await import("../../config/database");

      vi.spyOn(prisma.invoice, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.validation, "create").mockResolvedValue({} as any);

      const mockInvoice = {
        id: "inv-null-tax",
        organizationId: "org-test",
        invoiceNumber: "INV-NULL-TAX",
        totalAmount: 10000 as any,
        subtotalAmount: 8500 as any,
        taxAmount: null,
        supplierId: null,
      };

      const failures = await runValidations("org-test", mockInvoice as any, 95);
      const taxFailure = failures.find((f) => f.ruleCode === "TAX_CALCULATION");

      expect(taxFailure).toBeDefined();
      expect(taxFailure?.exceptionType).toBe("MISSING_TAX_DATA");
    }, 20000);

    it("runValidations passes tax calculation when subtotal and tax are explicitly entered and balance", async () => {
      const { runValidations } = await import("./service");
      const { prisma } = await import("../../config/database");

      vi.spyOn(prisma.invoice, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.validation, "create").mockResolvedValue({} as any);

      const mockInvoice = {
        id: "inv-valid-tax",
        organizationId: "org-test",
        invoiceNumber: "INV-VALID-TAX",
        totalAmount: 11800 as any,
        subtotalAmount: 10000 as any,
        taxAmount: 1800 as any,
        supplierId: null,
      };

      const failures = await runValidations("org-test", mockInvoice as any, 95);
      const taxFailure = failures.find((f) => f.ruleCode === "TAX_CALCULATION");

      expect(taxFailure).toBeUndefined();
    }, 20000);

    it("blocks approval and raises MISSING_TAX_DATA when subtotal or tax is null", async () => {
      const { verifyApprovalAuthority } = await import("../approvals/service");

      const mockTx = {
        auditLog: { findFirst: vi.fn().mockResolvedValue(null) },
        exception: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "ex-1" }),
        },
        invoice: {
          findFirst: vi.fn().mockResolvedValue({
            subtotalAmount: null,
            taxAmount: null,
          }),
        },
      } as any;

      await expect(
        verifyApprovalAuthority(mockTx, {
          organizationId: "org-1",
          invoiceId: "inv-null-tax",
          invoiceNumber: "INV-NULL-TAX",
          totalAmount: 10000,
        })
      ).rejects.toThrow(/Subtotal and tax amount cannot be null.*MISSING_TAX_DATA/);

      expect(mockTx.exception.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "MISSING_TAX_DATA",
            invoiceId: "inv-null-tax",
          }),
        })
      );
    }, 20000);
  });

  describe("T-205: GST Handling: IGST vs CGST/SGST by Place of Supply & GSTIN Validation", () => {
    it("extracts state code from valid 15-char GSTIN", () => {
      expect(extractGstinStateCode("27AAACT2727Q1ZW")).toBe("27");
      expect(extractGstinStateCode("29AAACB5678B2ZQ")).toBe("29");
      expect(extractGstinStateCode("07AABCA9012C3ZR")).toBe("07");
      expect(extractGstinStateCode(null)).toBeNull();
      expect(extractGstinStateCode("INVALID")).toBeNull();
    });

    it("intra-state supply (same state codes): splits equally into CGST + SGST, IGST = 0", () => {
      // Both Maharashtra (27)
      const result = calculateGstSplit({
        supplierGstin: "27AAACT2727Q1ZW",
        buyerGstin: "27AAACA1234F1Z5",
        totalTax: 1800.0,
      });

      expect(result.placeOfSupplyType).toBe("INTRA_STATE");
      expect(result.supplierStateCode).toBe("27");
      expect(result.buyerStateCode).toBe("27");
      expect(result.cgst).toBe(900.0);
      expect(result.sgst).toBe(900.0);
      expect(result.igst).toBe(0);
      expect(result.isBalanced).toBe(true);
    });

    it("intra-state supply balances odd-paisa totals exactly (e.g. 100.01 -> 50.00 CGST + 50.01 SGST)", () => {
      const result = calculateGstSplit({
        supplierGstin: "27AAACT2727Q1ZW",
        buyerGstin: "27AAACA1234F1Z5",
        totalTax: 100.01,
      });

      expect(result.placeOfSupplyType).toBe("INTRA_STATE");
      expect(result.cgst).toBe(50.0);
      expect(result.sgst).toBe(50.01);
      expect(result.igst).toBe(0);
      expect(result.cgst + result.sgst).toBeCloseTo(100.01, 2);
      expect(result.isBalanced).toBe(true);
    });

    it("inter-state supply (different state codes): assigns 100% to IGST, CGST = 0, SGST = 0", () => {
      // Karnataka (29) -> Maharashtra (27)
      const result = calculateGstSplit({
        supplierGstin: "29AAACB5678B2ZQ",
        buyerGstin: "27AAACA1234F1Z5",
        totalTax: 1800.0,
      });

      expect(result.placeOfSupplyType).toBe("INTER_STATE");
      expect(result.supplierStateCode).toBe("29");
      expect(result.buyerStateCode).toBe("27");
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(1800.0);
      expect(result.isBalanced).toBe(true);
    });

    it("0% rated line: returns 0.00 for all tax components and isBalanced: true", () => {
      const result = calculateGstSplit({
        supplierGstin: "27AAACT2727Q1ZW",
        buyerGstin: "27AAACA1234F1Z5",
        totalTax: 0,
      });

      expect(result.placeOfSupplyType).toBe("INTRA_STATE");
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.isBalanced).toBe(true);
    });

    it("validates organization GSTIN with Modulo-36 check digit and normalizes to uppercase", async () => {
      const { updateOrganizationSchema } = await import("../organization/validation");

      // Valid GSTIN lowercase input normalizes to uppercase
      const parsed = updateOrganizationSchema.parse({
        gstin: "27aaact2727q1zw",
      });
      expect(parsed.gstin).toBe("27AAACT2727Q1ZW");

      // Invalid Modulo-36 check digit rejects
      expect(() =>
        updateOrganizationSchema.parse({
          gstin: "27AAACT2727Q1ZZ",
        })
      ).toThrow(/Modulo-36 check-digit/i);
    });
  });
});
