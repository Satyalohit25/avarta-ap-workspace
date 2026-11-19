import { describe, expect, it } from "vitest";
import {
  calculateMsmeDueDate,
  evaluateMsmeCompliance,
  generateSection43BhReport,
  isMsmeProtected,
  validateUdyamNumber,
} from "./msme";

describe("T-502: MSME 45-Day Payment Tracking & Section 43B(h) Compliance", () => {
  describe("Udyam Registration Number Validation", () => {
    it("accepts valid Ministry of MSME Udyam registration numbers", () => {
      // Pattern: UDYAM-XX-00-0000000
      const mh = validateUdyamNumber("UDYAM-MH-12-0012345");
      expect(mh.isValid).toBe(true);
      expect(mh.normalizedUdyam).toBe("UDYAM-MH-12-0012345");
      expect(mh.stateCode).toBe("MH");

      const dl = validateUdyamNumber("UDYAM-DL-01-0054321");
      expect(dl.isValid).toBe(true);
      expect(dl.stateCode).toBe("DL");

      const ka = validateUdyamNumber("udyam-ka-03-0098765"); // lowercase normalized
      expect(ka.isValid).toBe(true);
      expect(ka.normalizedUdyam).toBe("UDYAM-KA-03-0098765");
      expect(ka.stateCode).toBe("KA");
    });

    it("rejects malformed or invalid Udyam strings", () => {
      expect(validateUdyamNumber("").isValid).toBe(false);
      expect(validateUdyamNumber(null).isValid).toBe(false);
      expect(validateUdyamNumber("UDYAM-1234").isValid).toBe(false);
      expect(validateUdyamNumber("UDYAM-M-12-0012345").isValid).toBe(false); // 1 letter state code
      expect(validateUdyamNumber("UDYAM-MH-1-0012345").isValid).toBe(false); // 1 digit district code
      expect(validateUdyamNumber("UDYAM-MH-12-12345").isValid).toBe(false); // 5 digits serial instead of 7
      expect(validateUdyamNumber("MSME-MH-12-0012345").isValid).toBe(false); // Wrong prefix
    });
  });

  describe("MSME Category Protection Scope", () => {
    it("protects Micro and Small enterprises under MSMED Act Section 15 and 43B(h)", () => {
      expect(isMsmeProtected("MICRO")).toBe(true);
      expect(isMsmeProtected("micro")).toBe(true);
      expect(isMsmeProtected("SMALL")).toBe(true);
      expect(isMsmeProtected("small")).toBe(true);
    });

    it("excludes Medium and Non-MSME enterprises from statutory 45-day cap and 43B(h)", () => {
      expect(isMsmeProtected("MEDIUM")).toBe(false);
      expect(isMsmeProtected("medium")).toBe(false);
      expect(isMsmeProtected("NON_MSME")).toBe(false);
      expect(isMsmeProtected(null)).toBe(false);
      expect(isMsmeProtected(undefined)).toBe(false);
    });
  });

  describe("Statutory Due Date Calculation (MSMED Act Section 15)", () => {
    it("strictly caps agreed terms at 45 days for Micro enterprises with written agreement", () => {
      // Contract terms = 60 days. Law mandates maximum 45 days.
      const res = calculateMsmeDueDate({
        invoiceDate: "2026-04-01",
        msmeCategory: "MICRO",
        hasAgreement: true,
        agreedTermsDays: 60,
      });

      expect(res.statutoryMaxDays).toBe(45);
      expect(res.isCappedByMsmeLaw).toBe(true);
      expect(res.statutoryDueDate).toBe("2026-05-16"); // 2026-04-01 + 45 days
      expect(res.ruleExplanation).toContain("45 days maximum");
    });

    it("respects agreed terms when <= 45 days for Micro/Small enterprises", () => {
      // Contract terms = 30 days. Valid since <= 45 days.
      const res = calculateMsmeDueDate({
        invoiceDate: "2026-04-01",
        msmeCategory: "SMALL",
        hasAgreement: true,
        agreedTermsDays: 30,
      });

      expect(res.statutoryMaxDays).toBe(45);
      expect(res.isCappedByMsmeLaw).toBe(false);
      expect(res.statutoryDueDate).toBe("2026-05-01"); // 2026-04-01 + 30 days
    });

    it("strictly enforces 15-day statutory limit when no written agreement exists", () => {
      // No agreement. Law mandates payment within 15 days of invoice date.
      const res = calculateMsmeDueDate({
        invoiceDate: "2026-04-01",
        msmeCategory: "MICRO",
        hasAgreement: false,
        agreedTermsDays: 30, // Contractual default ignored in absence of written agreement
      });

      expect(res.statutoryMaxDays).toBe(15);
      expect(res.statutoryDueDate).toBe("2026-04-16"); // 2026-04-01 + 15 days
      expect(res.ruleExplanation).toContain("mandated within 15 days");
    });

    it("permits standard agreed terms for Medium and Non-MSME enterprises", () => {
      // Medium enterprise with 90 days terms
      const res = calculateMsmeDueDate({
        invoiceDate: "2026-04-01",
        msmeCategory: "MEDIUM",
        hasAgreement: true,
        agreedTermsDays: 90,
      });

      expect(res.isCappedByMsmeLaw).toBe(false);
      expect(res.statutoryDueDate).toBe("2026-06-30"); // 2026-04-01 + 90 days
      expect(res.ruleExplanation).toContain("Normal commercial terms apply");
    });
  });

  describe("MSME Operational Warning Indicators", () => {
    it("returns ON_TRACK status when > 7 days remain before statutory due date", () => {
      const evaluation = evaluateMsmeCompliance({
        invoiceDate: "2026-05-01",
        amount: 25000,
        msmeCategory: "MICRO",
        hasAgreement: true,
        agreedTermsDays: 45, // Due 2026-06-15
        asOfDate: "2026-05-15", // 31 days remaining
      });

      expect(evaluation.status).toBe("ON_TRACK");
      expect(evaluation.daysRemainingOrOverdue).toBe(31);
      expect(evaluation.statusBadgeVariant).toBe("info");
      expect(evaluation.disallowanceRisk).toBe(false);
    });

    it("returns WARNING status when <= 7 days remain before statutory due date", () => {
      const evaluation = evaluateMsmeCompliance({
        invoiceDate: "2026-05-01",
        amount: 25000,
        msmeCategory: "MICRO",
        hasAgreement: true,
        agreedTermsDays: 45, // Due 2026-06-15
        asOfDate: "2026-06-10", // 5 days remaining
      });

      expect(evaluation.status).toBe("WARNING");
      expect(evaluation.daysRemainingOrOverdue).toBe(5);
      expect(evaluation.statusBadgeVariant).toBe("warning");
      expect(evaluation.warningMessage).toContain("5 day(s) remaining");
      expect(evaluation.disallowanceRisk).toBe(false);
    });

    it("returns OVERDUE status and flags disallowance risk when past statutory deadline", () => {
      const evaluation = evaluateMsmeCompliance({
        invoiceDate: "2026-05-01",
        amount: 25000,
        msmeCategory: "SMALL",
        hasAgreement: true,
        agreedTermsDays: 45, // Due 2026-06-15
        asOfDate: "2026-06-20", // 5 days overdue
      });

      expect(evaluation.status).toBe("OVERDUE");
      expect(evaluation.daysRemainingOrOverdue).toBe(-5);
      expect(evaluation.statusBadgeVariant).toBe("destructive");
      expect(evaluation.warningMessage).toContain("CRITICAL: Overdue by 5 day(s)");
      expect(evaluation.disallowanceRisk).toBe(true);
    });

    it("returns COMPLIANT when settled on or before statutory due date", () => {
      const evaluation = evaluateMsmeCompliance({
        invoiceDate: "2026-05-01",
        amount: 25000,
        msmeCategory: "MICRO",
        paidDate: "2026-05-25", // Paid well before 2026-06-15
        hasAgreement: true,
        agreedTermsDays: 45,
      });

      expect(evaluation.status).toBe("COMPLIANT");
      expect(evaluation.statusBadgeVariant).toBe("success");
      expect(evaluation.disallowanceRisk).toBe(false);
    });

    it("returns SETTLED_LATE when paid after statutory due date", () => {
      const evaluation = evaluateMsmeCompliance({
        invoiceDate: "2026-05-01",
        amount: 25000,
        msmeCategory: "MICRO",
        paidDate: "2026-06-25", // Due 2026-06-15, paid 10 days late
        hasAgreement: true,
        agreedTermsDays: 45,
      });

      expect(evaluation.status).toBe("SETTLED_LATE");
      expect(evaluation.statusBadgeVariant).toBe("warning");
      expect(evaluation.warningMessage).toContain("Settled 10 days past MSME statutory due date");
    });
  });

  describe("Section 43B(h) Year-End Disallowance Audit Report", () => {
    it("identifies invoices subject to Income Tax Section 43B(h) disallowance as of March 31", () => {
      const invoices = [
        // Case 1: Micro supplier invoice, dated 2027-01-10.
        // Statutory due date = 2027-02-24 (<= March 31). Unpaid as of March 31!
        // -> DISALLOWED under Section 43B(h)
        {
          id: "inv-disallowed-1",
          invoiceNumber: "INV-2027-001",
          supplierId: "sup-micro-1",
          supplierName: "Shree Precision Tools",
          supplierPan: "AABFS1234M",
          udyamNumber: "UDYAM-MH-12-0012345",
          msmeCategory: "MICRO",
          invoiceDate: "2027-01-10",
          amount: 150000,
          paidDate: null, // Unpaid
        },
        // Case 2: Small supplier invoice, dated 2027-02-01.
        // Statutory due date = 2027-03-18 (<= March 31). Paid late on 2027-04-15 (after March 31)!
        // -> DISALLOWED under Section 43B(h)
        {
          id: "inv-disallowed-2",
          invoiceNumber: "INV-2027-002",
          supplierId: "sup-small-2",
          supplierName: "Bharat Polymers",
          supplierPan: "AAACB5678K",
          udyamNumber: "UDYAM-GJ-04-0098765",
          msmeCategory: "SMALL",
          invoiceDate: "2027-02-01",
          amount: 85000,
          paidDate: "2027-04-15", // Paid in next FY
        },
        // Case 3: Micro supplier invoice, dated 2027-02-15.
        // Paid on 2027-03-20 (within statutory 45 days and before March 31).
        // -> ALLOWED (Compliant)
        {
          id: "inv-allowed-1",
          invoiceNumber: "INV-2027-003",
          supplierId: "sup-micro-1",
          supplierName: "Shree Precision Tools",
          supplierPan: "AABFS1234M",
          udyamNumber: "UDYAM-MH-12-0012345",
          msmeCategory: "MICRO",
          invoiceDate: "2027-02-15",
          amount: 50000,
          paidDate: "2027-03-20",
        },
        // Case 4: Medium enterprise invoice, dated 2027-01-15, unpaid as of March 31.
        // -> Section 43B(h) DOES NOT APPLY to Medium enterprises!
        {
          id: "inv-medium-1",
          invoiceNumber: "INV-2027-004",
          supplierId: "sup-medium-1",
          supplierName: "Kirloskar Heavy Engineering",
          supplierPan: "AAACK9999P",
          udyamNumber: "UDYAM-KA-02-0077777",
          msmeCategory: "MEDIUM",
          invoiceDate: "2027-01-15",
          amount: 500000,
          paidDate: null,
        },
        // Case 5: Micro invoice dated 2027-03-15.
        // Statutory due date = 2027-04-29 (falls in NEXT FY). Unpaid as of March 31, but NOT overdue on March 31.
        // Under Section 43B(h), since the 45-day statutory limit has NOT expired by March 31, it is NOT disallowed!
        {
          id: "inv-allowed-2",
          invoiceNumber: "INV-2027-005",
          supplierId: "sup-micro-1",
          supplierName: "Shree Precision Tools",
          supplierPan: "AABFS1234M",
          udyamNumber: "UDYAM-MH-12-0012345",
          msmeCategory: "MICRO",
          invoiceDate: "2027-03-15",
          amount: 60000,
          paidDate: null,
        },
      ];

      const report = generateSection43BhReport({
        financialYear: "2026-2027",
        invoices,
      });

      expect(report.financialYear).toBe("FY 2026-27");
      expect(report.yearEndDate).toBe("2027-03-31");
      expect(report.disallowedInvoiceCount).toBe(2); // inv-disallowed-1 and inv-disallowed-2
      expect(report.totalDisallowedAmount).toBe(235000); // 150000 + 85000
      expect(report.impactedSuppliersCount).toBe(2);

      const item1 = report.items.find((i) => i.invoiceId === "inv-disallowed-1");
      expect(item1).toBeDefined();
      expect(item1?.statusAsOfMarch31).toBe("DISALLOWED_UNPAID");
      expect(item1?.disallowedAmount).toBe(150000);
      expect(item1?.delayDays).toBeGreaterThan(0);

      const item2 = report.items.find((i) => i.invoiceId === "inv-disallowed-2");
      expect(item2).toBeDefined();
      expect(item2?.statusAsOfMarch31).toBe("DISALLOWED_PAID_LATE");
      expect(item2?.disallowedAmount).toBe(85000);

      // Verify Case 4 (Medium) and Case 5 (due in April) are excluded from disallowance
      expect(report.items.find((i) => i.invoiceId === "inv-medium-1")).toBeUndefined();
      expect(report.items.find((i) => i.invoiceId === "inv-allowed-2")).toBeUndefined();
    });
  });
});
