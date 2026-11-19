import { describe, it, expect } from "vitest";
import {
  toMinorUnits,
  toMajorUnits,
  calculateLineTaxMinor,
  SUPPORTED_CURRENCIES,
} from "../../lib/money";
import {
  validateTaxArithmetic,
  resolveTaxTolerance,
} from "./tax-validator";

describe("T-213: Minor Unit Money Math & Tax Tolerance Suite", () => {
  describe("1. Minor Unit Integer Conversions & Rounding Invariants", () => {
    it("converts major units to minor units with banker's half-up rounding", () => {
      expect(toMinorUnits(10.5, "INR")).toBe(1050);
      expect(toMinorUnits(10.55, "INR")).toBe(1055);
      expect(toMinorUnits(10.554, "INR")).toBe(1055);
      expect(toMinorUnits(10.555, "INR")).toBe(1056);
      expect(toMinorUnits(10.556, "INR")).toBe(1056);

      // USD cents
      expect(toMinorUnits(49.99, "USD")).toBe(4999);
      expect(toMinorUnits("49.99", "USD")).toBe(4999);

      // JPY 0 decimals
      expect(toMinorUnits(1500, "JPY")).toBe(1500);
    });

    it("prevents standard IEEE-754 float drift (e.g. 0.1 + 0.2 = 0.3)", () => {
      const a = toMinorUnits(0.1, "USD"); // 10 cents
      const b = toMinorUnits(0.2, "USD"); // 20 cents
      const sumMinor = a + b; // 30 cents exact integer
      expect(sumMinor).toBe(30);
      expect(toMajorUnits(sumMinor, "USD")).toBe(0.3);
    });

    it("converts minor units back to major units with correct decimal formatting", () => {
      expect(toMajorUnits(1055, "INR")).toBe(10.55);
      expect(toMajorUnits(4999, "USD")).toBe(49.99);
      expect(toMajorUnits(1500, "JPY")).toBe(1500);
    });
  });

  describe("2. Configurable Tax Tolerance by Currency & Organization", () => {
    it("resolves strict tolerance for USD/EUR (0.05) vs flexible for INR (0.50)", () => {
      expect(resolveTaxTolerance({ currency: "USD" })).toBe(0.05);
      expect(resolveTaxTolerance({ currency: "EUR" })).toBe(0.05);
      expect(resolveTaxTolerance({ currency: "INR" })).toBe(0.5);
    });

    it("applies per-organization currency overrides when configured", () => {
      const config = {
        currency: "USD",
        currencyOverrides: {
          USD: 0.02, // extra strict for this enterprise
          INR: 0.25,
        },
      };
      expect(resolveTaxTolerance(config)).toBe(0.02);
    });

    it("scales tolerance dynamically based on line count (e.g. 0.01 per line allowance)", () => {
      // 50 lines: base 0.50 + 49 * 0.01 = 0.99
      const tol50 = resolveTaxTolerance({
        currency: "INR",
        lineCount: 50,
        tolerancePerLine: 0.01,
      });
      expect(tol50).toBeCloseTo(0.99, 2);
    });

    it("rejects loose 1.0 discrepancy on USD invoice when strict tolerance (0.05) is configured", () => {
      // Subtotal $1,000.00 + Tax $100.00 = $1,100.00, billed as $1,100.50 (diff: $0.50)
      // Old flat 1.0 tolerance would have erroneously accepted this discrepancy!
      const result = validateTaxArithmetic(1000, 100, 1100.5, {
        currency: "USD",
        toleranceMajor: 0.05,
      });
      expect(result.isValid).toBe(false);
      expect(result.difference).toBe(0.5);
    });
  });

  describe("3. Multi-Line Stress Test: 50 Lines at Fractional Tax Rates", () => {
    it("passes multi-line invoice with 50 lines at fractional tax rates with exact paisa totals", () => {
      const lineCount = 50;
      let totalSubtotalMinor = 0;
      let totalTaxMinor = 0;

      // Simulate 50 invoice lines with fractional rates (e.g. 18.5%, 12.25%, 5.5%, etc.)
      const lines = [];
      for (let i = 1; i <= lineCount; i++) {
        const qty = i % 5 + 1; // 1 to 5 units
        const unitPrice = 125.5 + i * 10.25; // fractional unit price
        const taxRate = 18.0; // 18% GST

        const unitPriceMinor = toMinorUnits(unitPrice, "INR");
        const lineSubtotalMinor = unitPriceMinor * qty;
        const lineTaxMinor = calculateLineTaxMinor(qty, unitPrice, taxRate, "INR");
        const lineTotalMinor = lineSubtotalMinor + lineTaxMinor;

        totalSubtotalMinor += lineSubtotalMinor;
        totalTaxMinor += lineTaxMinor;

        lines.push({
          lineNumber: i,
          quantity: qty,
          unitPrice,
          taxRate,
          subtotalMinor: lineSubtotalMinor,
          taxMinor: lineTaxMinor,
          totalMinor: lineTotalMinor,
        });
      }

      const invoiceSubtotal = toMajorUnits(totalSubtotalMinor, "INR");
      const invoiceTax = toMajorUnits(totalTaxMinor, "INR");
      const expectedInvoiceTotalMinor = totalSubtotalMinor + totalTaxMinor;
      const invoiceTotal = toMajorUnits(expectedInvoiceTotalMinor, "INR");

      // Validate through validateTaxArithmetic with dynamic line count allowance
      const validation = validateTaxArithmetic(invoiceSubtotal, invoiceTax, invoiceTotal, {
        currency: "INR",
        lineCount: 50,
        tolerancePerLine: 0.01,
      });

      expect(validation.isValid).toBe(true);
      expect(validation.difference).toBe(0); // Exact paisa match!
    });
  });
});
