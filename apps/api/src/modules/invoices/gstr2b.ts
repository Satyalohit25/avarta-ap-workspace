/**
 * GSTR-2B Reconciliation & Input Tax Credit (ITC) Matching (T-503)
 * Aligned with Indian GST Law (Section 16(2)(aa) of CGST Act 2017 & Rule 36(4)).
 */

export interface Gstr2bRecord {
  supplierGstin: string;
  supplierName?: string;
  invoiceNumber: string;
  invoiceDate?: string;
  invoiceValue: number;
  taxableAmount: number;
  taxAmount: number; // IGST + CGST + SGST + Cess
  itcEligibility: "Y" | "N";
  filingDate?: string;
  reverseCharge?: boolean;
}

export type Gstr2bMatchStatus =
  | "MATCHED" // Found in GSTR-2B, tax matches within tolerance -> ITC Eligible
  | "TAX_MISMATCH" // Found in GSTR-2B, but tax amount discrepancy exceeds tolerance
  | "MISSING_IN_GSTR2B" // In AP Workspace books, but missing in GSTR-2B -> Ineligible / Blocked ITC
  | "MISSING_IN_BOOKS"; // Found in GSTR-2B, but not yet recorded in AP Workspace

export interface Gstr2bMatchResult {
  status: Gstr2bMatchStatus;
  itcStatus: "ELIGIBLE" | "RESTRICTED" | "BLOCKED" | "UNRECORDED";
  booksInvoiceId?: string;
  invoiceNumber: string;
  normalizedInvoiceNumber: string;
  supplierGstin: string;
  supplierName?: string;
  booksTaxAmount?: number;
  booksTotalAmount?: number;
  gstr2bTaxAmount?: number;
  gstr2bTotalAmount?: number;
  taxDifference?: number;
  reason?: string;
}

export interface Gstr2bReconciliationSummary {
  totalBooksInvoices: number;
  totalGstr2bRecords: number;
  totalBooksTaxAmount: number;
  totalGstr2bTaxAmount: number;

  matchedCount: number;
  matchedEligibleItc: number;

  taxMismatchCount: number;
  taxMismatchDiscrepancy: number;

  missingInGstr2bCount: number;
  missingInGstr2bBlockedItc: number;

  missingInBooksCount: number;
  missingInBooksTaxAmount: number;

  results: Gstr2bMatchResult[];
}

/**
 * Normalizes an invoice number to ensure robust matching against GST Portal records:
 * Removes spaces, slashes, hyphens, and converts to uppercase.
 * Example: "INV/2026/001" -> "INV2026001", "00123" -> "123".
 */
export function normalizeInvoiceNumber(invNum: string | null | undefined): string {
  if (!invNum || typeof invNum !== "string") return "";
  // Strip special chars & uppercase
  const cleaned = invNum.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Strip leading zeros if numeric (e.g. "0045" -> "45", but keep "INV001" intact)
  if (/^0+[1-9]\d*$/.test(cleaned)) {
    return cleaned.replace(/^0+/, "");
  }
  return cleaned;
}

/**
 * Parses standard GSTR-2B JSON exported from GST Portal / GSTN API.
 */
export function parseGstr2bJson(content: string | object): Gstr2bRecord[] {
  const records: Gstr2bRecord[] = [];
  const data = typeof content === "string" ? JSON.parse(content) : content;

  // Format 1: GST Portal JSON with data.b2b array
  const b2bList = data?.data?.b2b || data?.b2b || (Array.isArray(data) ? data : []);

  for (const supplierEntry of b2bList) {
    const supplierGstin = (supplierEntry.ctin || supplierEntry.supplierGstin || "").trim().toUpperCase();
    const supplierName = supplierEntry.trdNm || supplierEntry.supplierName || "";

    const invList = supplierEntry.inv || supplierEntry.invoices || [];
    if (Array.isArray(invList)) {
      for (const inv of invList) {
        const inum = String(inv.inum || inv.invoiceNumber || "").trim();
        const idt = String(inv.idt || inv.invoiceDate || "").trim();
        const val = Number(inv.val || inv.invoiceValue || 0);
        const itcavl = (inv.itcavl || inv.itcEligibility || "Y").toUpperCase() === "N" ? "N" : "Y";

        let taxableAmount = 0;
        let taxAmount = 0;

        const items = inv.items || inv.invLines || [];
        if (Array.isArray(items) && items.length > 0) {
          for (const item of items) {
            taxableAmount += Number(item.txval || 0);
            taxAmount +=
              Number(item.iamt || 0) +
              Number(item.camt || 0) +
              Number(item.samt || 0) +
              Number(item.csamt || 0);
          }
        } else {
          taxableAmount = Number(inv.taxableAmount || 0);
          taxAmount = Number(inv.taxAmount || 0);
        }

        if (inum && supplierGstin) {
          records.push({
            supplierGstin,
            supplierName,
            invoiceNumber: inum,
            invoiceDate: idt,
            invoiceValue: val > 0 ? val : taxableAmount + taxAmount,
            taxableAmount,
            taxAmount,
            itcEligibility: itcavl as "Y" | "N",
            filingDate: inv.filingDate,
            reverseCharge: inv.rev === "Y" || inv.reverseCharge === true,
          });
        }
      }
    } else if (supplierEntry.invoiceNumber && supplierGstin) {
      // Flat entry
      records.push({
        supplierGstin,
        supplierName,
        invoiceNumber: String(supplierEntry.invoiceNumber),
        invoiceDate: supplierEntry.invoiceDate,
        invoiceValue: Number(supplierEntry.invoiceValue || supplierEntry.totalAmount || 0),
        taxableAmount: Number(supplierEntry.taxableAmount || 0),
        taxAmount: Number(supplierEntry.taxAmount || 0),
        itcEligibility: (supplierEntry.itcEligibility || "Y").toUpperCase() === "N" ? "N" : "Y",
      });
    }
  }

  return records;
}

/**
 * Parses official GSTR-2B CSV downloaded from GST Portal.
 * Expected headers:
 * GSTIN of supplier,Trade/Legal name,Invoice number,Invoice type,Invoice Date,Invoice Value,Place of supply,Reverse Charge,Taxable Value,Integrated Tax,Central Tax,State/UT Tax,Cess,GSTR-1/5 Filing Date,ITC Availability
 */
export function parseGstr2bCsv(content: string): Gstr2bRecord[] {
  const records: Gstr2bRecord[] = [];
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  if (lines.length < 2) return records;

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(",").map((h) => h.replace(/["\r]/g, "").trim());

  // Find column indices
  const gstinIdx = headers.findIndex((h) => h.includes("gstin"));
  const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("trade") || h.includes("legal"));
  const invNumIdx = headers.findIndex((h) => h.includes("invoice number") || h.includes("inv no") || h === "inum");
  const invDateIdx = headers.findIndex((h) => h.includes("invoice date") || h === "idt");
  const invValIdx = headers.findIndex((h) => h.includes("invoice value") || h === "val");
  const txValIdx = headers.findIndex((h) => h.includes("taxable value") || h === "txval");
  const igstIdx = headers.findIndex((h) => h.includes("integrated") || h === "iamt");
  const cgstIdx = headers.findIndex((h) => h.includes("central") || h === "camt");
  const sgstIdx = headers.findIndex((h) => h.includes("state") || h === "samt");
  const cessIdx = headers.findIndex((h) => h.includes("cess") || h === "csamt");
  const itcIdx = headers.findIndex((h) => h.includes("itc") || h === "itcavl");

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(",").map((c) => c.replace(/["\r]/g, "").trim());
    if (rawCols.length < 3) continue;

    const supplierGstin = (rawCols[gstinIdx >= 0 ? gstinIdx : 0] || "").toUpperCase();
    const invoiceNumber = rawCols[invNumIdx >= 0 ? invNumIdx : 2] || "";
    if (!supplierGstin || !invoiceNumber) continue;

    const supplierName = nameIdx >= 0 ? rawCols[nameIdx] : undefined;
    const invoiceDate = invDateIdx >= 0 ? rawCols[invDateIdx] : undefined;
    const invoiceValue = invValIdx >= 0 ? parseFloat(rawCols[invValIdx]) || 0 : 0;
    const taxableAmount = txValIdx >= 0 ? parseFloat(rawCols[txValIdx]) || 0 : 0;

    const igst = igstIdx >= 0 ? parseFloat(rawCols[igstIdx]) || 0 : 0;
    const cgst = cgstIdx >= 0 ? parseFloat(rawCols[cgstIdx]) || 0 : 0;
    const sgst = sgstIdx >= 0 ? parseFloat(rawCols[sgstIdx]) || 0 : 0;
    const cess = cessIdx >= 0 ? parseFloat(rawCols[cessIdx]) || 0 : 0;
    const taxAmount = igst + cgst + sgst + cess;

    const itcRaw = itcIdx >= 0 ? rawCols[itcIdx].toUpperCase() : "Y";
    const itcEligibility = itcRaw.startsWith("N") ? "N" : "Y";

    records.push({
      supplierGstin,
      supplierName,
      invoiceNumber,
      invoiceDate,
      invoiceValue: invoiceValue > 0 ? invoiceValue : taxableAmount + taxAmount,
      taxableAmount,
      taxAmount,
      itcEligibility,
    });
  }

  return records;
}

/**
 * Reconciles AP Workspace recorded invoices against imported GSTR-2B records.
 * Follows Rule 36(4) & Section 16(2)(aa) matching parameters.
 */
export function reconcileGstr2b(
  booksInvoices: Array<{
    id: string;
    invoiceNumber: string;
    supplierGstin?: string | null;
    supplierName?: string;
    taxAmount: number;
    totalAmount: number;
    invoiceDate?: Date | string | null;
  }>,
  gstr2bRecords: Gstr2bRecord[],
  taxTolerance: number = 1.0
): Gstr2bReconciliationSummary {
  const results: Gstr2bMatchResult[] = [];

  let matchedCount = 0;
  let matchedEligibleItc = 0;

  let taxMismatchCount = 0;
  let taxMismatchDiscrepancy = 0;

  let missingInGstr2bCount = 0;
  let missingInGstr2bBlockedItc = 0;

  // Build lookup index of GSTR-2B records: key = `${supplierGstin}|${normalizeInvoiceNumber(invNum)}`
  const gstr2bMap = new Map<string, Gstr2bRecord>();
  const matchedGstr2bKeys = new Set<string>();

  for (const gRecord of gstr2bRecords) {
    const key = `${gRecord.supplierGstin.trim().toUpperCase()}|${normalizeInvoiceNumber(gRecord.invoiceNumber)}`;
    gstr2bMap.set(key, gRecord);
  }

  const totalBooksTaxAmount = booksInvoices.reduce((acc, inv) => acc + Number(inv.taxAmount || 0), 0);
  const totalGstr2bTaxAmount = gstr2bRecords.reduce((acc, r) => acc + Number(r.taxAmount || 0), 0);

  // 1. Check each invoice in the AP books
  for (const inv of booksInvoices) {
    const gstin = (inv.supplierGstin || "").trim().toUpperCase();
    const normInvNum = normalizeInvoiceNumber(inv.invoiceNumber);
    const key = `${gstin}|${normInvNum}`;

    const gRecord = gstr2bMap.get(key);

    if (!gRecord) {
      // Missing in GSTR-2B -> Supplier has not filed GSTR-1, ITC is blocked under Sec 16(2)(aa)
      missingInGstr2bCount++;
      const tax = Number(inv.taxAmount || 0);
      missingInGstr2bBlockedItc += tax;

      results.push({
        status: "MISSING_IN_GSTR2B",
        itcStatus: "BLOCKED",
        booksInvoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        normalizedInvoiceNumber: normInvNum,
        supplierGstin: gstin,
        supplierName: inv.supplierName,
        booksTaxAmount: tax,
        booksTotalAmount: Number(inv.totalAmount || 0),
        reason: `Invoice "${inv.invoiceNumber}" not found in GSTR-2B for supplier ${gstin}. Supplier may not have filed GSTR-1. ITC blocked under Section 16(2)(aa).`,
      });
      continue;
    }

    // Found in GSTR-2B! Mark key as consumed
    matchedGstr2bKeys.add(key);

    const booksTax = Number(inv.taxAmount || 0);
    const gstrTax = Number(gRecord.taxAmount || 0);
    const taxDiff = Math.abs(booksTax - gstrTax);

    if (taxDiff <= taxTolerance) {
      // Matched within tolerance!
      matchedCount++;
      matchedEligibleItc += Math.min(booksTax, gstrTax);

      results.push({
        status: "MATCHED",
        itcStatus: gRecord.itcEligibility === "N" ? "BLOCKED" : "ELIGIBLE",
        booksInvoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        normalizedInvoiceNumber: normInvNum,
        supplierGstin: gstin,
        supplierName: gRecord.supplierName || inv.supplierName,
        booksTaxAmount: booksTax,
        booksTotalAmount: Number(inv.totalAmount || 0),
        gstr2bTaxAmount: gstrTax,
        gstr2bTotalAmount: gRecord.invoiceValue,
        taxDifference: Number(taxDiff.toFixed(2)),
        reason:
          gRecord.itcEligibility === "N"
            ? "Invoice matches GSTR-2B, but flagged ineligible by supplier in GSTR-1."
            : "Invoice matches GSTR-2B filing. Input Tax Credit (ITC) fully eligible.",
      });
    } else {
      // Tax mismatch!
      taxMismatchCount++;
      taxMismatchDiscrepancy += taxDiff;

      results.push({
        status: "TAX_MISMATCH",
        itcStatus: "RESTRICTED",
        booksInvoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        normalizedInvoiceNumber: normInvNum,
        supplierGstin: gstin,
        supplierName: gRecord.supplierName || inv.supplierName,
        booksTaxAmount: booksTax,
        booksTotalAmount: Number(inv.totalAmount || 0),
        gstr2bTaxAmount: gstrTax,
        gstr2bTotalAmount: gRecord.invoiceValue,
        taxDifference: Number(taxDiff.toFixed(2)),
        reason: `Tax discrepancy: Books report ₹${booksTax.toFixed(2)}, GSTR-2B reports ₹${gstrTax.toFixed(2)} (Variance: ₹${taxDiff.toFixed(2)} exceeds ₹${taxTolerance} tolerance).`,
      });
    }
  }

  // 2. Identify records in GSTR-2B that were never recorded in AP books
  let missingInBooksCount = 0;
  let missingInBooksTaxAmount = 0;

  for (const [key, gRecord] of gstr2bMap.entries()) {
    if (!matchedGstr2bKeys.has(key)) {
      missingInBooksCount++;
      missingInBooksTaxAmount += gRecord.taxAmount;

      results.push({
        status: "MISSING_IN_BOOKS",
        itcStatus: "UNRECORDED",
        invoiceNumber: gRecord.invoiceNumber,
        normalizedInvoiceNumber: normalizeInvoiceNumber(gRecord.invoiceNumber),
        supplierGstin: gRecord.supplierGstin,
        supplierName: gRecord.supplierName,
        gstr2bTaxAmount: gRecord.taxAmount,
        gstr2bTotalAmount: gRecord.invoiceValue,
        reason: `Record present in GSTR-2B for supplier ${gRecord.supplierGstin}, but no matching invoice found in AP Workspace books.`,
      });
    }
  }

  return {
    totalBooksInvoices: booksInvoices.length,
    totalGstr2bRecords: gstr2bRecords.length,
    totalBooksTaxAmount: Number(totalBooksTaxAmount.toFixed(2)),
    totalGstr2bTaxAmount: Number(totalGstr2bTaxAmount.toFixed(2)),

    matchedCount,
    matchedEligibleItc: Number(matchedEligibleItc.toFixed(2)),

    taxMismatchCount,
    taxMismatchDiscrepancy: Number(taxMismatchDiscrepancy.toFixed(2)),

    missingInGstr2bCount,
    missingInGstr2bBlockedItc: Number(missingInGstr2bBlockedItc.toFixed(2)),

    missingInBooksCount,
    missingInBooksTaxAmount: Number(missingInBooksTaxAmount.toFixed(2)),

    results,
  };
}
