import { describe, expect, it } from "vitest";
import {
  calculateGstinCheckDigit,
  validateGstinChecksum,
  validateTaxArithmetic,
} from "./tax-validator";

describe("Tax ID & Arithmetic Validation (Step 10)", () => {
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
  });
});
