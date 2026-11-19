/**
 * Timezone and Indian Fiscal Year utilities.
 * Handles calendar date operations, fiscal year calculations, and day boundaries
 * according to organization timezone (default "Asia/Kolkata").
 *
 * References: RULE-DATE-002, RULE-DATE-005, T-206
 */

export interface DateParts {
  year: number;
  month: number; // 0-indexed: 0 = January, 3 = April, 11 = December
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Extracts local date parts for a given Date in a specific IANA timezone.
 */
export function getDatePartsInTimezone(
  date: Date,
  timezone: string = "Asia/Kolkata"
): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      partMap[p.type] = parseInt(p.value, 10);
    }
  }

  return {
    year: partMap.year,
    month: (partMap.month || 1) - 1, // 0-indexed month
    day: partMap.day,
    hour: partMap.hour === 24 ? 0 : partMap.hour,
    minute: partMap.minute,
    second: partMap.second,
  };
}

/**
 * Converts local calendar year, month, day, hour, min, sec in a given timezone
 * into an exact UTC Date instance.
 */
export function localToUtc(
  year: number,
  monthIndex: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0,
  millisecond: number = 0,
  timezone: string = "Asia/Kolkata"
): Date {
  const candidateUtc = Date.UTC(year, monthIndex, day, hour, minute, second, 0);
  const parts = getDatePartsInTimezone(new Date(candidateUtc), timezone);
  const candidateLocalAsUtc = Date.UTC(
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0
  );
  const offsetMs = candidateLocalAsUtc - candidateUtc;
  return new Date(candidateUtc - offsetMs + millisecond);
}

/**
 * Computes Indian Fiscal Year (e.g. FY2026-27, FY2027-28) using organization timezone.
 * In India, FY runs from 1 April of year T to 31 March of year T+1.
 *
 * Example:
 *  - 2027-03-31 20:00:00 UTC -> 2027-04-01 01:30:00 IST -> FY2027-28
 *  - 2027-03-31 17:00:00 UTC -> 2027-03-31 22:30:00 IST -> FY2026-27
 */
export function calculateIndianFiscalYear(
  date: Date = new Date(),
  timezone: string = "Asia/Kolkata"
): string {
  const { year, month } = getDatePartsInTimezone(date, timezone);
  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return `FY${startYear}-${endYearShort}`;
}

/**
 * Returns UTC Date corresponding to 00:00:00.000 local time of today in timezone.
 */
export function getStartOfTodayInTimezone(
  now: Date = new Date(),
  timezone: string = "Asia/Kolkata"
): Date {
  const { year, month, day } = getDatePartsInTimezone(now, timezone);
  return localToUtc(year, month, day, 0, 0, 0, 0, timezone);
}

/**
 * Returns UTC Date corresponding to 23:59:59.999 local time of today in timezone.
 */
export function getEndOfTodayInTimezone(
  now: Date = new Date(),
  timezone: string = "Asia/Kolkata"
): Date {
  const { year, month, day } = getDatePartsInTimezone(now, timezone);
  return localToUtc(year, month, day, 23, 59, 59, 999, timezone);
}

/**
 * Returns UTC Date corresponding to 00:00:00.000 local time of the 1st of the month.
 */
export function getStartOfMonthInTimezone(
  now: Date = new Date(),
  timezone: string = "Asia/Kolkata"
): Date {
  const { year, month } = getDatePartsInTimezone(now, timezone);
  return localToUtc(year, month, 1, 0, 0, 0, 0, timezone);
}

/**
 * Returns UTC Date corresponding to 00:00:00.000 local time on the day of the given date.
 */
export function getStartOfDayInTimezone(
  date: Date,
  timezone: string = "Asia/Kolkata"
): Date {
  const { year, month, day } = getDatePartsInTimezone(date, timezone);
  return localToUtc(year, month, day, 0, 0, 0, 0, timezone);
}
