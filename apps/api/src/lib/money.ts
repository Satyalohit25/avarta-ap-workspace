/**
 * Avarta AP Workspace — Precision Monetary Math & Currency Utilities
 * Standardizes minor unit integer arithmetic (paise, cents), half-up banker's rounding,
 * and currency-specific tax tolerances.
 */

export interface CurrencyMetadata {
  code: string;
  decimals: number;
  minorUnitName: string;
  defaultTaxToleranceMajor: number; // in major currency unit (e.g. 0.05 for USD/EUR, 0.50 for INR)
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyMetadata> = {
  INR: { code: "INR", decimals: 2, minorUnitName: "paisa", defaultTaxToleranceMajor: 0.5 },
  USD: { code: "USD", decimals: 2, minorUnitName: "cent", defaultTaxToleranceMajor: 0.05 },
  EUR: { code: "EUR", decimals: 2, minorUnitName: "cent", defaultTaxToleranceMajor: 0.05 },
  GBP: { code: "GBP", decimals: 2, minorUnitName: "penny", defaultTaxToleranceMajor: 0.05 },
  CAD: { code: "CAD", decimals: 2, minorUnitName: "cent", defaultTaxToleranceMajor: 0.05 },
  AUD: { code: "AUD", decimals: 2, minorUnitName: "cent", defaultTaxToleranceMajor: 0.05 },
  SGD: { code: "SGD", decimals: 2, minorUnitName: "cent", defaultTaxToleranceMajor: 0.05 },
  JPY: { code: "JPY", decimals: 0, minorUnitName: "yen", defaultTaxToleranceMajor: 1.0 },
};

/**
 * Converts a major unit monetary value (number or string) to an exact integer in minor units
 * using standard half-up rounding (e.g. 10.555 -> 1056 paise).
 */
export function toMinorUnits(amount: number | string, currency = "INR"): number {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return 0;
  const decimals = SUPPORTED_CURRENCIES[currency.toUpperCase()]?.decimals ?? 2;
  const multiplier = Math.pow(10, decimals);
  // Mitigate binary float noise (e.g. 1.005 * 100 = 100.49999999999999) using Number.EPSILON
  return Math.round((num + (num >= 0 ? 1 : -1) * Number.EPSILON) * multiplier);
}

/**
 * Converts an integer minor unit value back to a floating point major unit number with 2 decimals.
 */
export function toMajorUnits(minorUnits: number, currency = "INR"): number {
  const decimals = SUPPORTED_CURRENCIES[currency.toUpperCase()]?.decimals ?? 2;
  const divisor = Math.pow(10, decimals);
  return Number((minorUnits / divisor).toFixed(decimals));
}

/**
 * Calculates per-line tax amount in integer minor units with half-up rounding:
 * taxMinor = round(quantity * unitPriceMinor * taxRate / 100)
 */
export function calculateLineTaxMinor(
  quantity: number,
  unitPrice: number,
  taxRatePercent: number,
  currency = "INR"
): number {
  if (quantity <= 0 || unitPrice <= 0 || taxRatePercent <= 0) return 0;
  const lineAmountMinor = Math.round(toMinorUnits(unitPrice, currency) * quantity);
  return Math.round((lineAmountMinor * taxRatePercent) / 100);
}
