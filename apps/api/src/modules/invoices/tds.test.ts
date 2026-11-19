import { describe, expect, it, beforeEach } from "vitest";
import {
  calculateTds,
  evaluateTdsRate,
  getIndianFinancialPeriod,
  generateForm16ASummary,
  generateForm26QQuarterlySummary,
  TDS_SECTION_MASTER,
  tdsLedger,
  validatePan,
} from "./tds";
import { applyPaymentTds } from "../payments/tds";

describe("T-501: Statutory Indian TDS Deduction & TDS Payable Ledger", () => {
  const orgId = "org-test-tds-compliance";

  beforeEach(() => {
    tdsLedger.clear(orgId);
  });

  describe("TDS Section Master Definitions", () => {
    it("defines statutory sections with correct rates and thresholds", () => {
      // 194C: Contractor payments (1% Ind/HUF, 2% Co/Other, ₹30,000 threshold)
      const sec194c = TDS_SECTION_MASTER["194C"];
      expect(sec194c).toBeDefined();
      expect(sec194c.individualHufRatePercent).toBe(1.0);
      expect(sec194c.companyOtherRatePercent).toBe(2.0);
      expect(sec194c.statutoryThresholdAmount).toBe(30000);

      // 194J Technical (2%) vs Professional (10%)
      const sec194jTech = TDS_SECTION_MASTER["194J_TECHNICAL"];
      expect(sec194jTech.individualHufRatePercent).toBe(2.0);

      const sec194jProf = TDS_SECTION_MASTER["194J_PROFESSIONAL"];
      expect(sec194jProf.companyOtherRatePercent).toBe(10.0);

      // 194I Plant (2%) vs Building (10%, ₹2,40,000 threshold)
      const sec194iPlant = TDS_SECTION_MASTER["194I_PLANT_MACHINERY"];
      expect(sec194iPlant.companyOtherRatePercent).toBe(2.0);

      const sec194iBldg = TDS_SECTION_MASTER["194I_LAND_BUILDING"];
      expect(sec194iBldg.companyOtherRatePercent).toBe(10.0);
      expect(sec194iBldg.statutoryThresholdAmount).toBe(240000);

      // 194Q: Purchase of Goods (0.1%, ₹50 Lakh threshold)
      const sec194q = TDS_SECTION_MASTER["194Q"];
      expect(sec194q.individualHufRatePercent).toBe(0.1);
      expect(sec194q.companyOtherRatePercent).toBe(0.1);
      expect(sec194q.statutoryThresholdAmount).toBe(5000000);

      // 194H: Commission (5%, ₹15,000 threshold)
      const sec194h = TDS_SECTION_MASTER["194H"];
      expect(sec194h.companyOtherRatePercent).toBe(5.0);

      // 194A: Interest (10%, ₹5,000 threshold)
      const sec194a = TDS_SECTION_MASTER["194A"];
      expect(sec194a.companyOtherRatePercent).toBe(10.0);
    });
  });

  describe("PAN Validation & Entity Type Extraction", () => {
    it("validates Indian PAN format and extracts entity type from 4th character", () => {
      // 4th char 'P' = Individual
      const individual = validatePan("ABCPD1234F");
      expect(individual.isValid).toBe(true);
      expect(individual.normalizedPan).toBe("ABCPD1234F");
      expect(individual.entityType).toBe("INDIVIDUAL");

      // 4th char 'C' = Company
      const company = validatePan("AAACA9999K");
      expect(company.isValid).toBe(true);
      expect(company.entityType).toBe("COMPANY");

      // 4th char 'F' = Partnership Firm / LLP
      const firm = validatePan("AABFA5555L");
      expect(firm.isValid).toBe(true);
      expect(firm.entityType).toBe("FIRM");

      // 4th char 'H' = Hindu Undivided Family (HUF)
      const huf = validatePan("AABHA7777J");
      expect(huf.isValid).toBe(true);
      expect(huf.entityType).toBe("HUF");
    });

    it("rejects invalid PAN strings", () => {
      expect(validatePan("").isValid).toBe(false);
      expect(validatePan(null).isValid).toBe(false);
      expect(validatePan("12345ABCDE").isValid).toBe(false);
      expect(validatePan("TOOLONGPAN123").isValid).toBe(false);
      expect(validatePan("SHORT").isValid).toBe(false);
    });
  });

  describe("PAN-Based Rate Evaluation & Section 206AA Surcharge", () => {
    it("applies 1% for Individual under Section 194C", () => {
      const res = evaluateTdsRate({
        sectionCode: "194C",
        pan: "ABCPD1234F", // Individual 'P'
      });
      expect(res.applicableRatePercent).toBe(1.0);
      expect(res.isSection206AAApplied).toBe(false);
      expect(res.isPanValid).toBe(true);
    });

    it("applies 2% for Company under Section 194C", () => {
      const res = evaluateTdsRate({
        sectionCode: "194C",
        pan: "AAACA9999K", // Company 'C'
      });
      expect(res.applicableRatePercent).toBe(2.0);
      expect(res.isSection206AAApplied).toBe(false);
    });

    it("strictly enforces Section 206AA statutory 20% rate when PAN is missing or null", () => {
      const resMissing = evaluateTdsRate({
        sectionCode: "194C",
        pan: null,
      });
      expect(resMissing.applicableRatePercent).toBe(20.0);
      expect(resMissing.isSection206AAApplied).toBe(true);
      expect(resMissing.isPanValid).toBe(false);
      expect(resMissing.reason).toContain("Section 206AA");
    });

    it("strictly enforces Section 206AA statutory 20% rate when PAN format is invalid", () => {
      const resInvalid = evaluateTdsRate({
        sectionCode: "194J_PROFESSIONAL",
        pan: "INVALID-PAN-123",
      });
      expect(resInvalid.applicableRatePercent).toBe(20.0);
      expect(resInvalid.isSection206AAApplied).toBe(true);
    });

    it("supports Section 197 Lower Deduction Certificate override with valid PAN", () => {
      const resLower = evaluateTdsRate({
        sectionCode: "194C",
        pan: "AAACA9999K",
        customRatePercent: 0.5, // 0.5% certificate rate
      });
      expect(resLower.applicableRatePercent).toBe(0.5);
      expect(resLower.isSection206AAApplied).toBe(false);
      expect(resLower.reason).toContain("Section 197");
    });
  });

  describe("TDS Net Payable Math & Paisa Rounding", () => {
    it("calculates exact deduction and net payable amount", () => {
      // Gross ₹1,00,000 at 2% TDS -> ₹2,000 TDS, ₹98,000 Net
      const result = calculateTds({
        grossAmount: 100000,
        sectionCode: "194C",
        pan: "AAACA9999K", // Company
      });
      expect(result.grossAmount).toBe(100000);
      expect(result.tdsRatePercent).toBe(2.0);
      expect(result.tdsAmount).toBe(2000);
      expect(result.netPayableAmount).toBe(98000);
    });

    it("rounds fractional paisa correctly to 2 decimal places", () => {
      // Gross ₹75,321.45 at 1% TDS: 753.2145 -> ₹753.21 TDS, Net ₹74,568.24
      const result = calculateTds({
        grossAmount: 75321.45,
        sectionCode: "194C",
        pan: "ABCPD1234F", // Individual (1%)
      });
      expect(result.tdsRatePercent).toBe(1.0);
      expect(result.tdsAmount).toBe(753.21);
      expect(result.netPayableAmount).toBe(74568.24);
      expect(Math.round((result.tdsAmount + result.netPayableAmount) * 100) / 100).toBe(result.grossAmount);
    });

    it("applies 20% on 194Q purchase of goods when PAN is missing", () => {
      const result = calculateTds({
        grossAmount: 500000,
        sectionCode: "194Q",
        pan: null,
      });
      expect(result.tdsRatePercent).toBe(20.0);
      expect(result.tdsAmount).toBe(100000);
      expect(result.netPayableAmount).toBe(400000);
      expect(result.isSection206AAApplied).toBe(true);
    });
  });

  describe("Indian Financial Period Math", () => {
    it("correctly identifies Financial Year and Quarter (Q1 to Q4)", () => {
      // April (Q1): FY 2026-27
      expect(getIndianFinancialPeriod("2026-04-15")).toEqual({ financialYear: "FY 2026-27", quarter: "Q1" });
      // June (Q1): FY 2026-27
      expect(getIndianFinancialPeriod("2026-06-30")).toEqual({ financialYear: "FY 2026-27", quarter: "Q1" });
      // July (Q2): FY 2026-27
      expect(getIndianFinancialPeriod("2026-07-01")).toEqual({ financialYear: "FY 2026-27", quarter: "Q2" });
      // October (Q3): FY 2026-27
      expect(getIndianFinancialPeriod("2026-10-10")).toEqual({ financialYear: "FY 2026-27", quarter: "Q3" });
      // January (Q4): FY 2026-27
      expect(getIndianFinancialPeriod("2027-01-20")).toEqual({ financialYear: "FY 2026-27", quarter: "Q4" });
      // March 31 (Q4): FY 2026-27
      expect(getIndianFinancialPeriod("2027-03-31")).toEqual({ financialYear: "FY 2026-27", quarter: "Q4" });
    });
  });

  describe("TDS Payable Ledger & Reporting (Form 16A & Form 26Q)", () => {
    it("records payment TDS in ledger and generates Form 16A and 26Q summaries", () => {
      // Transaction 1: Vendor A under 194C in Q1
      const res1 = applyPaymentTds({
        organizationId: orgId,
        invoiceId: "inv-001",
        invoiceNumber: "INV-2026-001",
        supplierId: "sup-001",
        supplierName: "Apex Logistics Ltd",
        supplierPan: "AAACA1111A", // Company 2%
        grossAmount: 50000,
        sectionCode: "194C",
        deductionDate: "2026-05-10",
      });
      expect(res1.netPayableAmount).toBe(49000);
      expect(res1.tdsAmount).toBe(1000);

      // Transaction 2: Vendor A under 194C in Q1
      const res2 = applyPaymentTds({
        organizationId: orgId,
        invoiceId: "inv-002",
        invoiceNumber: "INV-2026-002",
        supplierId: "sup-001",
        supplierName: "Apex Logistics Ltd",
        supplierPan: "AAACA1111A", // Company 2%
        grossAmount: 70000,
        sectionCode: "194C",
        deductionDate: "2026-06-15",
      });
      expect(res2.netPayableAmount).toBe(68600);
      expect(res2.tdsAmount).toBe(1400);

      // Transaction 3: Vendor B under 194J in Q1 (No PAN -> 20%)
      const res3 = applyPaymentTds({
        organizationId: orgId,
        invoiceId: "inv-003",
        invoiceNumber: "INV-2026-003",
        supplierId: "sup-002",
        supplierName: "Tech Consultants",
        supplierPan: null, // Missing PAN -> 20% Section 206AA
        grossAmount: 40000,
        sectionCode: "194J_PROFESSIONAL",
        deductionDate: "2026-06-20",
      });
      expect(res3.tdsRatePercent).toBe(20.0);
      expect(res3.tdsAmount).toBe(8000);
      expect(res3.netPayableAmount).toBe(32000);
      expect(res3.isSection206AAApplied).toBe(true);

      // Test Form 16A Summary for Vendor A
      const form16A = generateForm16ASummary(orgId, "AAACA1111A", "FY 2026-27", "Q1");
      expect(form16A.length).toBe(1);
      expect(form16A[0].totalGrossAmount).toBe(120000);
      expect(form16A[0].totalTdsDeducted).toBe(2400);
      expect(form16A[0].totalNetPaid).toBe(117600);
      expect(form16A[0].transactionCount).toBe(2);

      // Test Form 26Q Quarterly Return Summary for Q1
      const form26Q = generateForm26QQuarterlySummary(orgId, "FY 2026-27", "Q1");
      expect(form26Q.totalGrossAmount).toBe(160000);
      expect(form26Q.totalTdsDeducted).toBe(10400);
      expect(form26Q.totalDeductees).toBe(2); // Vendor A + Vendor B
      expect(form26Q.sectionWiseBreakdown.length).toBe(2);

      const sec194cData = form26Q.sectionWiseBreakdown.find((s) => s.sectionCode === "194C");
      expect(sec194cData?.grossAmount).toBe(120000);
      expect(sec194cData?.tdsAmount).toBe(2400);

      const sec194jData = form26Q.sectionWiseBreakdown.find((s) => s.sectionCode === "194J_PROFESSIONAL");
      expect(sec194jData?.grossAmount).toBe(40000);
      expect(sec194jData?.tdsAmount).toBe(8000);
    });
  });
});
