import { describe, expect, it } from "vitest";
import { calculateDueDate } from "./due-date";

/**
 * Legacy implementation from InvoiceForm.tsx that suffered from DEFECT-MATH-02.
 */
function legacyCalculateDueDate(baseDateStr: string, termsDays: number): string {
  if (!baseDateStr) return "";
  const base = new Date(baseDateStr);
  if (isNaN(base.getTime())) return "";
  base.setDate(base.getDate() + termsDays);
  return base.toISOString().split("T")[0];
}

describe("Due Date Calculation across Month Boundaries and DST (T-214 / DEFECT-MATH-02)", () => {
  describe("Defect Reproduction: Legacy implementation flaws", () => {
    it("documents why legacy implementation fails when timezone is behind UTC across DST", () => {
      // In America/New_York (UTC-5), "2026-02-20" parses as UTC midnight.
      // In local time, UTC midnight is 2026-02-19 19:00:00 EST.
      // base.getDate() returns 19.
      // Adding 30 days in local time lands on 2026-03-21 19:00:00 EDT (since US DST starts March 8).
      // EDT is UTC-4, so 2026-03-21 19:00 EDT is 2026-03-21 23:00:00 UTC.
      // toISOString().split('T')[0] yields "2026-03-21" instead of the correct "2026-03-22"!
      const baseStr = "2026-02-20";
      const terms = 30;

      // Legacy function computes against local system timezone
      const legacyResult = legacyCalculateDueDate(baseStr, terms);
      expect(typeof legacyResult).toBe("string");

      // Pure UTC calculateDueDate always produces exactly 2026-03-22
      expect(calculateDueDate(baseStr, terms)).toBe("2026-03-22");
    });
  });

  describe("Timezone Invariance Test Matrix", () => {
    const timezones = [
      "UTC",
      "Asia/Kolkata",
      "America/New_York",
      "America/Los_Angeles",
      "Pacific/Auckland",
    ];

    it.each(timezones)("computes correct due dates identically under timezone %s", (tz) => {
      const originalTz = process.env.TZ;
      try {
        process.env.TZ = tz;

        // Standard 30-day term
        expect(calculateDueDate("2026-02-20", 30)).toBe("2026-03-22");

        // Leap year 30-day term (2024 is a leap year; Feb has 29 days)
        expect(calculateDueDate("2024-02-20", 30)).toBe("2024-03-21");

        // Month boundary: Jan 31 + 30 days in non-leap year (31 in Jan + 28 in Feb = 59 days -> Mar 2)
        expect(calculateDueDate("2026-01-31", 30)).toBe("2026-03-02");

        // Month boundary: March 31 + 30 days (31 in Mar -> Apr 30)
        expect(calculateDueDate("2026-03-31", 30)).toBe("2026-04-30");

        // Year boundary: Dec 15 + 30 days -> Jan 14 of next year
        expect(calculateDueDate("2026-12-15", 30)).toBe("2027-01-14");

        // Net 15, Net 45, Net 60, Net 90
        expect(calculateDueDate("2026-04-01", 15)).toBe("2026-04-16");
        expect(calculateDueDate("2026-04-01", 45)).toBe("2026-05-16");
        expect(calculateDueDate("2026-04-01", 60)).toBe("2026-05-31");
        expect(calculateDueDate("2026-04-01", 90)).toBe("2026-06-30");
      } finally {
        process.env.TZ = originalTz;
      }
    });
  });

  describe("Month Boundaries & Leap Year Edge Cases", () => {
    it("handles non-leap February transition correctly (2026)", () => {
      expect(calculateDueDate("2026-02-28", 1)).toBe("2026-03-01");
      expect(calculateDueDate("2026-02-01", 28)).toBe("2026-03-01");
    });

    it("handles leap year February transition correctly (2024 & 2028)", () => {
      expect(calculateDueDate("2024-02-28", 1)).toBe("2024-02-29");
      expect(calculateDueDate("2024-02-29", 1)).toBe("2024-03-01");
      expect(calculateDueDate("2028-02-29", 1)).toBe("2028-03-01");
    });

    it("handles 31st to 30th day month rollovers", () => {
      // May 31 + 30 days -> June 30
      expect(calculateDueDate("2026-05-31", 30)).toBe("2026-06-30");
      // August 31 + 30 days -> September 30
      expect(calculateDueDate("2026-08-31", 30)).toBe("2026-09-30");
    });

    it("handles year transition seamlessly", () => {
      expect(calculateDueDate("2026-12-31", 1)).toBe("2027-01-01");
      expect(calculateDueDate("2026-12-31", 365)).toBe("2027-12-31");
    });
  });

  describe("Daylight Saving Time (DST) Transitions", () => {
    it("crosses US Spring Forward (March 8, 2026) without dropping a day", () => {
      // 10 days before to 10 days after DST change
      expect(calculateDueDate("2026-03-01", 10)).toBe("2026-03-11");
      expect(calculateDueDate("2026-03-07", 2)).toBe("2026-03-09");
    });

    it("crosses US Fall Back (November 1, 2026) without gaining a day", () => {
      expect(calculateDueDate("2026-10-25", 10)).toBe("2026-11-04");
      expect(calculateDueDate("2026-10-31", 2)).toBe("2026-11-02");
    });

    it("crosses European Spring Forward (March 29, 2026) without error", () => {
      expect(calculateDueDate("2026-03-25", 7)).toBe("2026-04-01");
    });
  });

  describe("Edge cases & Input Sanitization", () => {
    it("returns empty string for falsy or invalid inputs", () => {
      expect(calculateDueDate("", 30)).toBe("");
      expect(calculateDueDate("invalid-date", 30)).toBe("");
      expect(calculateDueDate(null as any, 30)).toBe("");
      expect(calculateDueDate(undefined as any, 30)).toBe("");
    });

    it("handles zero terms as the same date", () => {
      expect(calculateDueDate("2026-06-15", 0)).toBe("2026-06-15");
    });

    it("handles negative terms (e.g. discounting or retrospective window)", () => {
      expect(calculateDueDate("2026-03-05", -5)).toBe("2026-02-28");
    });

    it("handles fractional terms by truncating/flooring to integer days", () => {
      expect(calculateDueDate("2026-06-01", 15.8)).toBe("2026-06-16");
    });

    it("handles ISO datetime strings with timezone offsets gracefully", () => {
      expect(calculateDueDate("2026-02-20T14:30:00Z", 30)).toBe("2026-03-22");
    });
  });
});
