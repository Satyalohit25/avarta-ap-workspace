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

export interface TaxValidationResult {
  isValid: boolean;
  ruleCode: "INVALID_GST" | "TAX_DIFFERENCE";
  message: string;
}

export function validateTaxArithmetic(
  subtotal: number,
  tax: number,
  total: number,
  tolerance = 1.0 // allow up to 1 currency unit rounding difference
): { isValid: boolean; difference: number } {
  const expectedTotal = subtotal + tax;
  const difference = Math.abs(expectedTotal - total);
  return {
    isValid: difference <= tolerance,
    difference,
  };
}
