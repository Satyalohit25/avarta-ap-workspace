/**
 * Indian GSTIN Validation and Checksum Verification (Step 10).
 * GSTIN structure: 15 alphanumeric characters
 * Format: [2 digits state code][10 char PAN][1 char entity][1 char 'Z'][1 check digit]
 */

const GST_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function calculateGstinCheckDigit(base14: string): string {
  let factor = 2;
  let sum = 0;
  for (let i = 13; i >= 0; i--) {
    const codePoint = GST_CHARS.indexOf(base14[i]);
    if (codePoint === -1) return "";

    const product = factor * codePoint;
    factor = factor === 2 ? 1 : 2;

    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    sum += quotient + remainder;
  }

  const remainder = sum % 36;
  const checkCodePoint = (36 - remainder) % 36;
  return GST_CHARS[checkCodePoint];
}

export function validateGstinChecksum(gstin: string): boolean {
  if (!gstin || typeof gstin !== "string") return false;
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) return false;

  // Regex format check
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(clean)) return false;

  const expectedCheckChar = calculateGstinCheckDigit(clean.slice(0, 14));
  return expectedCheckChar === clean[14];
}

/**
 * Extracts 2-digit Indian state code from a valid GSTIN string.
 * Returns null if GSTIN is missing, malformed, or invalid.
 */
export function extractGstinStateCode(gstin: string | null | undefined): string | null {
  if (!gstin || typeof gstin !== "string") return null;
  const clean = gstin.trim().toUpperCase();
  if (clean.length < 2) return null;
  const stateCode = clean.slice(0, 2);
  if (/^[0-9]{2}$/.test(stateCode)) {
    return stateCode;
  }
  return null;
}

export interface GstSplitResult {
  placeOfSupplyType: "INTRA_STATE" | "INTER_STATE" | "UNKNOWN";
  supplierStateCode: string | null;
  buyerStateCode: string | null;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  isBalanced: boolean;
}

/**
 * Derives statutory GST tax split (CGST + SGST vs IGST) based on place of supply (T-205).
 * Intra-state (same supplier & buyer state): 50/50 CGST + SGST balanced to the paisa.
 * Inter-state (different state): 100% IGST, CGST = 0, SGST = 0.
 * 0% rated / zero tax: all tax components 0.00.
 */
export function calculateGstSplit(params: {
  supplierGstin?: string | null;
  buyerGstin?: string | null;
  totalTax: number | null | undefined;
  placeOfSupplyState?: string | null;
}): GstSplitResult {
  const tax = params.totalTax == null || isNaN(Number(params.totalTax)) ? 0 : Number(params.totalTax);
  const roundedTotalTax = Math.round(tax * 100) / 100;

  const supplierStateCode = extractGstinStateCode(params.supplierGstin);
  const buyerStateCode =
    params.placeOfSupplyState && /^[0-9]{2}$/.test(params.placeOfSupplyState.trim())
      ? params.placeOfSupplyState.trim()
      : extractGstinStateCode(params.buyerGstin);

  if (roundedTotalTax === 0) {
    return {
      placeOfSupplyType:
        supplierStateCode && buyerStateCode
          ? supplierStateCode === buyerStateCode
            ? "INTRA_STATE"
            : "INTER_STATE"
          : "UNKNOWN",
      supplierStateCode,
      buyerStateCode,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
      isBalanced: true,
    };
  }

  if (!supplierStateCode || !buyerStateCode) {
    return {
      placeOfSupplyType: "UNKNOWN",
      supplierStateCode,
      buyerStateCode,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: roundedTotalTax,
      isBalanced: false,
    };
  }

  if (supplierStateCode === buyerStateCode) {
    // Intra-state: CGST + SGST balanced to the exact paisa
    const cgst = Math.floor((roundedTotalTax / 2) * 100) / 100;
    const sgst = Math.round((roundedTotalTax - cgst) * 100) / 100;
    return {
      placeOfSupplyType: "INTRA_STATE",
      supplierStateCode,
      buyerStateCode,
      cgst,
      sgst,
      igst: 0,
      totalTax: roundedTotalTax,
      isBalanced: Math.abs(cgst + sgst - roundedTotalTax) < 0.0001,
    };
  } else {
    // Inter-state: 100% IGST
    return {
      placeOfSupplyType: "INTER_STATE",
      supplierStateCode,
      buyerStateCode,
      cgst: 0,
      sgst: 0,
      igst: roundedTotalTax,
      totalTax: roundedTotalTax,
      isBalanced: true,
    };
  }
}

export interface TaxValidationResult {
  isValid: boolean;
  ruleCode: "INVALID_GST" | "TAX_DIFFERENCE" | "MISSING_TAX_DATA";
  message: string;
}

import { toMinorUnits, toMajorUnits, SUPPORTED_CURRENCIES } from "../../lib/money";

export interface TaxToleranceConfig {
  currency?: string;
  lineCount?: number;
  toleranceMajor?: number; // Configured base tolerance for organization/currency
  tolerancePerLine?: number; // Dynamic allowance per invoice line (default 0.01)
  currencyOverrides?: Record<string, number>;
}

export function resolveTaxTolerance(config?: TaxToleranceConfig): number {
  const currency = (config?.currency || "INR").toUpperCase();
  const meta = SUPPORTED_CURRENCIES[currency];
  const override = config?.currencyOverrides?.[currency];
  const baseTolerance = override ?? config?.toleranceMajor ?? meta?.defaultTaxToleranceMajor ?? 0.5;
  const lineCount = Math.max(1, config?.lineCount ?? 1);
  const perLine = config?.tolerancePerLine ?? 0.01;
  // Dynamic rounding allowance: baseTolerance + (lineCount - 1) * perLine
  return baseTolerance + Math.max(0, lineCount - 1) * perLine;
}

export function validateTaxArithmetic(
  subtotal: number | null | undefined,
  tax: number | null | undefined,
  total: number,
  toleranceOrConfig?: number | TaxToleranceConfig
): { isValid: boolean; difference: number; missingData?: boolean } {
  if (subtotal == null || tax == null || isNaN(Number(subtotal)) || isNaN(Number(tax))) {
    return {
      isValid: false,
      difference: Math.abs(total),
      missingData: true,
    };
  }

  const currency = typeof toleranceOrConfig === "object" ? toleranceOrConfig.currency || "INR" : "INR";
  const tolerance =
    typeof toleranceOrConfig === "number"
      ? toleranceOrConfig
      : resolveTaxTolerance(toleranceOrConfig);

  const subtotalMinor = toMinorUnits(subtotal, currency);
  const taxMinor = toMinorUnits(tax, currency);
  const totalMinor = toMinorUnits(total, currency);

  const expectedTotalMinor = subtotalMinor + taxMinor;
  const differenceMinor = Math.abs(expectedTotalMinor - totalMinor);
  const difference = toMajorUnits(differenceMinor, currency);

  const toleranceMinor = toMinorUnits(tolerance, currency);

  return {
    isValid: differenceMinor <= toleranceMinor,
    difference,
    missingData: false,
  };
}
