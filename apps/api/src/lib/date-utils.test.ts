import { describe, expect, it } from "vitest";
import {
  calculateIndianFiscalYear,
  getDatePartsInTimezone,
  getEndOfTodayInTimezone,
  getStartOfDayInTimezone,
  getStartOfMonthInTimezone,
  getStartOfTodayInTimezone,
  localToUtc,
} from "./date-utils";

describe("Timezone and Fiscal Year Utilities (T-206 / RULE-DATE-002 / RULE-DATE-005)", () => {
  describe("calculateIndianFiscalYear with organization timezone", () => {
    it("returns FY2027-28 for 2027-03-31 20:00 UTC (1 April 01:30 IST)", () => {
      // 20:00 UTC on 31 March is 01:30 IST on 1 April 2027
      const date = new Date("2027-03-31T20:00:00.000Z");
      const fy = calculateIndianFiscalYear(date, "Asia/Kolkata");
      expect(fy).toBe("FY2027-28");
    });

    it("returns FY2026-27 for 2027-03-31 17:00 UTC (31 March 22:30 IST)", () => {
      // 17:00 UTC on 31 March is 22:30 IST on 31 March 2027
      const date = new Date("2027-03-31T17:00:00.000Z");
      const fy = calculateIndianFiscalYear(date, "Asia/Kolkata");
      expect(fy).toBe("FY2026-27");
    });

    it("correctly handles mid-year dates (e.g. November 2026)", () => {
      const date = new Date("2026-11-18T12:00:00.000Z");
      const fy = calculateIndianFiscalYear(date, "Asia/Kolkata");
      expect(fy).toBe("FY2026-27");
    });

    it("respects alternative timezones if configured", () => {
      // 2027-03-31 23:00 UTC in UTC is March 31 (FY2026-27)
      // but in Asia/Kolkata it is April 1 (FY2027-28)
      const date = new Date("2027-03-31T23:00:00.000Z");
      expect(calculateIndianFiscalYear(date, "UTC")).toBe("FY2026-27");
      expect(calculateIndianFiscalYear(date, "Asia/Kolkata")).toBe("FY2027-28");
    });
  });

  describe("Day boundaries in timezone", () => {
    it("computes startOfToday and endOfToday in Asia/Kolkata exactly", () => {
      // Reference: 2026-11-18 at 08:00 UTC (13:30 IST)
      const now = new Date("2026-11-18T08:00:00.000Z");
      const startOfToday = getStartOfTodayInTimezone(now, "Asia/Kolkata");
      const endOfToday = getEndOfTodayInTimezone(now, "Asia/Kolkata");

      // In Asia/Kolkata (UTC+5:30), start of day 2026-11-18 is 2026-11-17 18:30:00.000 UTC
      expect(startOfToday.toISOString()).toBe("2026-11-17T18:30:00.000Z");
      // End of day is 2026-11-18 18:29:59.999 UTC
      expect(endOfToday.toISOString()).toBe("2026-11-18T18:29:59.999Z");

      // Verify that formatting startOfToday in Asia/Kolkata gives 00:00:00
      const startParts = getDatePartsInTimezone(startOfToday, "Asia/Kolkata");
      expect(startParts.year).toBe(2026);
      expect(startParts.month).toBe(10); // November (0-based)
      expect(startParts.day).toBe(18);
      expect(startParts.hour).toBe(0);
      expect(startParts.minute).toBe(0);
      expect(startParts.second).toBe(0);
    });

    it("handles month boundary startOfMonth correctly", () => {
      const now = new Date("2026-11-18T08:00:00.000Z");
      const startOfMonth = getStartOfMonthInTimezone(now, "Asia/Kolkata");
      // In Asia/Kolkata, 1 Nov 2026 00:00:00 is 31 Oct 2026 18:30:00 UTC
      expect(startOfMonth.toISOString()).toBe("2026-10-31T18:30:00.000Z");
    });

    it("localToUtc matches round-trip with getDatePartsInTimezone", () => {
      const utc = localToUtc(2027, 3, 1, 10, 15, 30, 0, "Asia/Kolkata");
      const parts = getDatePartsInTimezone(utc, "Asia/Kolkata");
      expect(parts.year).toBe(2027);
      expect(parts.month).toBe(3);
      expect(parts.day).toBe(1);
      expect(parts.hour).toBe(10);
      expect(parts.minute).toBe(15);
      expect(parts.second).toBe(30);
    });
  });
});
