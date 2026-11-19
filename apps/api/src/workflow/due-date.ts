/**
 * Due Date Calculation across Month Boundaries and DST (T-214 / DEFECT-MATH-02)
 *
 * Uses strictly UTC-only date operations (Date.UTC, getUTCFullYear, getUTCMonth, getUTCDate, setUTCDate)
 * to prevent daylight-saving time jumps, timezone off-by-one errors in zones behind UTC (e.g. America/New_York),
 * and improper month-end rollovers.
 */
export function calculateDueDate(baseDateStr: string, termsDays: number): string {
  if (!baseDateStr || typeof baseDateStr !== "string") return "";

  // Parse YYYY-MM-DD components directly to avoid timezone-dependent string parsing
  const trimmed = baseDateStr.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);

  let utcDate: Date;
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed month
    const day = parseInt(match[3], 10);
    utcDate = new Date(Date.UTC(year, month, day));
  } else {
    // Fallback for non YYYY-MM-DD ISO string format
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return "";
    utcDate = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  if (isNaN(utcDate.getTime())) return "";

  const days = typeof termsDays === "number" && !isNaN(termsDays) ? Math.floor(termsDays) : 0;
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utcDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
