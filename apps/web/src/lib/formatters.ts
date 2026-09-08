/**
 * Avarta AP Workspace — Central Formatting Utilities
 * Standardizes monetary amounts with tabular figures (en-IN) and dates.
 */

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "INR"
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${currency} 0.00`;
  }
  const numericVal = Number(amount);
  const formatted = numericVal.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

export function formatDate(
  dateString: string | null | undefined,
  fallback = "—"
): string {
  if (!dateString) return fallback;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return fallback;
  }
}

export function formatCompactCurrency(
  amount: number | string | null | undefined,
  currencySymbol = "₹"
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${currencySymbol}0`;
  }
  const val = Number(amount);
  if (val >= 100000) {
    return `${currencySymbol}${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
  }
  if (val >= 1000) {
    return `${currencySymbol}${(val / 1000).toFixed(0)}k`;
  }
  return `${currencySymbol}${val.toFixed(0)}`;
}
