/**
 * Statutory Indian TDS (Tax Deducted at Source) & Ledger Engine (T-501)
 *
 * Implements Indian Income Tax Act 1961 provisions for Accounts Payable:
 * - TDS Section Master: 194C, 194J, 194I, 194Q, 194H, 194A
 * - Section 206AA: Higher rate (20%) on invalid or missing PAN
 * - Section 197: Lower deduction certificate override support
 * - Exact paisa net-payable deduction math
 * - TDS Payable Ledger entry recording
 * - Form 16A / Form 26Q quarterly TDS summary generation
 */

export interface TdsSectionDefinition {
  sectionCode: string;
  sectionName: string;
  description: string;
  individualHufRatePercent: number;
  companyOtherRatePercent: number;
  statutoryThresholdAmount: number;
}

export const TDS_SECTION_MASTER: Record<string, TdsSectionDefinition> = {
  "194C": {
    sectionCode: "194C",
    sectionName: "Payments to Contractors & Subcontractors",
    description: "Work contracts, catering, transport, advertising, manufacturing or supplying products according to customer specifications",
    individualHufRatePercent: 1.0,
    companyOtherRatePercent: 2.0,
    statutoryThresholdAmount: 30000, // ₹30,000 single bill or ₹1,00,000 aggregate
  },
  "194J_TECHNICAL": {
    sectionCode: "194J_TECHNICAL",
    sectionName: "Fees for Technical Services (FTS)",
    description: "Fees for technical services, call center services, IT development, engineering",
    individualHufRatePercent: 2.0,
    companyOtherRatePercent: 2.0,
    statutoryThresholdAmount: 30000,
  },
  "194J_PROFESSIONAL": {
    sectionCode: "194J_PROFESSIONAL",
    sectionName: "Fees for Professional Services",
    description: "Legal, medical, architectural, engineering, accountancy, interior decoration, technical consultancy",
    individualHufRatePercent: 10.0,
    companyOtherRatePercent: 10.0,
    statutoryThresholdAmount: 30000,
  },
  "194I_PLANT_MACHINERY": {
    sectionCode: "194I_PLANT_MACHINERY",
    sectionName: "Rent of Plant, Machinery or Equipment",
    description: "Lease or hire charges for industrial plant, commercial machinery or operating equipment",
    individualHufRatePercent: 2.0,
    companyOtherRatePercent: 2.0,
    statutoryThresholdAmount: 240000, // ₹2,40,000 per financial year
  },
  "194I_LAND_BUILDING": {
    sectionCode: "194I_LAND_BUILDING",
    sectionName: "Rent of Land, Building or Furniture",
    description: "Office rent, commercial building, factory lease, warehouse, furniture and fixtures",
    individualHufRatePercent: 10.0,
    companyOtherRatePercent: 10.0,
    statutoryThresholdAmount: 240000,
  },
  "194Q": {
    sectionCode: "194Q",
    sectionName: "Purchase of Goods",
    description: "TDS on purchase of goods exceeding ₹50 Lakhs in aggregate during the financial year",
    individualHufRatePercent: 0.1,
    companyOtherRatePercent: 0.1,
    statutoryThresholdAmount: 5000000, // ₹50,00,000 per FY
  },
  "194H": {
    sectionCode: "194H",
    sectionName: "Commission or Brokerage",
    description: "Sales commission, procurement agent fees, real estate or auction brokerage",
    individualHufRatePercent: 5.0,
    companyOtherRatePercent: 5.0,
    statutoryThresholdAmount: 15000,
  },
  "194A": {
    sectionCode: "194A",
    sectionName: "Interest Other Than Securities",
    description: "Vendor interest charges, unsecured loan interest, delayed payment interest",
    individualHufRatePercent: 10.0,
    companyOtherRatePercent: 10.0,
    statutoryThresholdAmount: 5000,
  },
};

/**
 * Validates 10-character Indian Permanent Account Number (PAN) format:
 * Pattern: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)
 * The 4th character indicates the entity type.
 */
export function validatePan(pan?: string | null): {
  isValid: boolean;
  normalizedPan: string | null;
  entityType?: "INDIVIDUAL" | "COMPANY" | "HUF" | "FIRM" | "OTHER";
} {
  if (!pan || typeof pan !== "string") {
    return { isValid: false, normalizedPan: null };
  }

  const clean = pan.trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!panRegex.test(clean)) {
    return { isValid: false, normalizedPan: clean };
  }

  const fourthChar = clean.charAt(3);
  let entityType: "INDIVIDUAL" | "COMPANY" | "HUF" | "FIRM" | "OTHER" = "OTHER";

  if (fourthChar === "P") entityType = "INDIVIDUAL";
  else if (fourthChar === "C") entityType = "COMPANY";
  else if (fourthChar === "H") entityType = "HUF";
  else if (fourthChar === "F") entityType = "FIRM";

  return { isValid: true, normalizedPan: clean, entityType };
}

export interface EvaluateTdsRateOptions {
  sectionCode: string;
  pan?: string | null;
  isIndividualHuf?: boolean;
  customRatePercent?: number | null; // e.g. Lower deduction certificate under Sec 197
}

export interface TdsRateEvaluationResult {
  sectionCode: string;
  sectionName: string;
  applicableRatePercent: number;
  isSection206AAApplied: boolean;
  pan: string | null;
  isPanValid: boolean;
  reason: string;
}

/**
 * Evaluates the statutory TDS rate for a given section and PAN.
 * Under Section 206AA, if PAN is missing or invalid, statutory rate is strictly 20%.
 */
export function evaluateTdsRate(options: EvaluateTdsRateOptions): TdsRateEvaluationResult {
  const { sectionCode, pan, isIndividualHuf, customRatePercent } = options;

  const section = TDS_SECTION_MASTER[sectionCode] || TDS_SECTION_MASTER["194C"];
  const panInfo = validatePan(pan);

  // If a valid Section 197 Lower Deduction Certificate exists and PAN is valid
  if (customRatePercent !== undefined && customRatePercent !== null && panInfo.isValid) {
    return {
      sectionCode: section.sectionCode,
      sectionName: section.sectionName,
      applicableRatePercent: Number(customRatePercent),
      isSection206AAApplied: false,
      pan: panInfo.normalizedPan,
      isPanValid: true,
      reason: `Section 197 lower deduction rate applied (${customRatePercent}%)`,
    };
  }

  // Section 206AA: Higher rate of 20% if PAN is absent or invalid
  if (!panInfo.isValid) {
    const standardRate = isIndividualHuf ? section.individualHufRatePercent : section.companyOtherRatePercent;
    const rate206AA = Math.max(standardRate, 20.0);
    return {
      sectionCode: section.sectionCode,
      sectionName: section.sectionName,
      applicableRatePercent: rate206AA,
      isSection206AAApplied: true,
      pan: panInfo.normalizedPan,
      isPanValid: false,
      reason: "Section 206AA enforced: Missing or invalid PAN requires minimum 20% statutory TDS deduction",
    };
  }

  // Determine rate based on PAN entity type or explicit parameter
  const isIndividual =
    isIndividualHuf ?? (panInfo.entityType === "INDIVIDUAL" || panInfo.entityType === "HUF");
  const sectionRate = isIndividual ? section.individualHufRatePercent : section.companyOtherRatePercent;

  return {
    sectionCode: section.sectionCode,
    sectionName: section.sectionName,
    applicableRatePercent: sectionRate,
    isSection206AAApplied: false,
    pan: panInfo.normalizedPan,
    isPanValid: true,
    reason: `Standard Section ${section.sectionCode} rate applied (${sectionRate}%) for ${isIndividual ? "Individual/HUF" : "Company/Firm"}`,
  };
}

export interface CalculateTdsParams {
  grossAmount: number;
  sectionCode: string;
  pan?: string | null;
  isIndividualHuf?: boolean;
  customRatePercent?: number | null;
}

export interface TdsCalculationResult {
  grossAmount: number;
  sectionCode: string;
  sectionName: string;
  tdsRatePercent: number;
  tdsAmount: number;
  netPayableAmount: number;
  pan: string | null;
  isSection206AAApplied: boolean;
  explanation: string;
}

/**
 * Calculates exact TDS deduction and net payable amount rounded strictly to 2 decimal places (paisa).
 */
export function calculateTds(params: CalculateTdsParams): TdsCalculationResult {
  const { grossAmount, sectionCode, pan, isIndividualHuf, customRatePercent } = params;

  const rateResult = evaluateTdsRate({
    sectionCode,
    pan,
    isIndividualHuf,
    customRatePercent,
  });

  const gross = Math.max(0, Number(grossAmount) || 0);
  const tdsRaw = (gross * rateResult.applicableRatePercent) / 100;
  // Round to paisa (2 decimal places)
  const tdsAmount = Math.round(tdsRaw * 100) / 100;
  const netPayable = Math.max(0, Math.round((gross - tdsAmount) * 100) / 100);

  return {
    grossAmount: gross,
    sectionCode: rateResult.sectionCode,
    sectionName: rateResult.sectionName,
    tdsRatePercent: rateResult.applicableRatePercent,
    tdsAmount,
    netPayableAmount: netPayable,
    pan: rateResult.pan,
    isSection206AAApplied: rateResult.isSection206AAApplied,
    explanation: rateResult.reason,
  };
}

export interface TdsLedgerEntry {
  id: string;
  organizationId: string;
  invoiceId: string;
  invoiceNumber?: string;
  paymentId?: string;
  supplierId: string;
  supplierName: string;
  supplierPan: string;
  sectionCode: string;
  sectionDescription: string;
  tdsRatePercent: number;
  grossAmount: number;
  tdsAmount: number;
  netPayableAmount: number;
  deductionDate: string; // YYYY-MM-DD
  financialYear: string;  // e.g. "FY 2026-27"
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  isSection206AAApplied: boolean;
  challanNumber?: string | null;
  bsrCode?: string | null;
}

/**
 * Computes Indian Financial Year and Quarter from a deduction date.
 * Financial Year runs April 1 to March 31.
 */
export function getIndianFinancialPeriod(date: Date | string): {
  financialYear: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
} {
  const d = typeof date === "string" ? new Date(date) : date;
  const month = d.getUTCMonth(); // 0 = Jan, 3 = Apr, 11 = Dec
  const year = d.getUTCFullYear();

  let startYear: number;
  let quarter: "Q1" | "Q2" | "Q3" | "Q4";

  if (month >= 3) {
    // April (3) to December (11)
    startYear = year;
    if (month <= 5) quarter = "Q1"; // Apr - Jun
    else if (month <= 8) quarter = "Q2"; // Jul - Sep
    else quarter = "Q3"; // Oct - Dec
  } else {
    // January (0) to March (2)
    startYear = year - 1;
    quarter = "Q4"; // Jan - Mar
  }

  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  const financialYear = `FY ${startYear}-${endYearShort}`;

  return { financialYear, quarter };
}

/**
 * In-memory / transactional TDS Payable Ledger registry.
 */
class TdsLedgerStore {
  private entries: Map<string, TdsLedgerEntry[]> = new Map(); // orgId -> entries

  public recordEntry(entry: Omit<TdsLedgerEntry, "id" | "financialYear" | "quarter">): TdsLedgerEntry {
    const { financialYear, quarter } = getIndianFinancialPeriod(entry.deductionDate);
    const fullEntry: TdsLedgerEntry = {
      ...entry,
      id: `tds-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      financialYear,
      quarter,
    };

    const list = this.entries.get(entry.organizationId) || [];
    list.push(fullEntry);
    this.entries.set(entry.organizationId, list);
    return fullEntry;
  }

  public getEntries(organizationId: string, filter?: {
    financialYear?: string;
    quarter?: "Q1" | "Q2" | "Q3" | "Q4";
    sectionCode?: string;
    supplierPan?: string;
  }): TdsLedgerEntry[] {
    const list = this.entries.get(organizationId) || [];
    if (!filter) return [...list];

    return list.filter((e) => {
      if (filter.financialYear && e.financialYear !== filter.financialYear) return false;
      if (filter.quarter && e.quarter !== filter.quarter) return false;
      if (filter.sectionCode && e.sectionCode !== filter.sectionCode) return false;
      if (filter.supplierPan && e.supplierPan !== filter.supplierPan.toUpperCase()) return false;
      return true;
    });
  }

  public clear(organizationId?: string) {
    if (organizationId) {
      this.entries.delete(organizationId);
    } else {
      this.entries.clear();
    }
  }
}

export const tdsLedger = new TdsLedgerStore();

export interface Form16ASummary {
  organizationId: string;
  financialYear: string;
  quarter: string;
  supplierPan: string;
  supplierName: string;
  sectionCode: string;
  totalGrossAmount: number;
  totalTdsDeducted: number;
  totalNetPaid: number;
  transactionCount: number;
  entries: TdsLedgerEntry[];
}

export interface Form26QQuarterlySummary {
  organizationId: string;
  financialYear: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  totalDeductees: number;
  totalGrossAmount: number;
  totalTdsDeducted: number;
  sectionWiseBreakdown: Array<{
    sectionCode: string;
    sectionDescription: string;
    deducteeCount: number;
    grossAmount: number;
    tdsAmount: number;
  }>;
}

/**
 * Generates aggregated Form 16A TDS certificate summary for a supplier.
 */
export function generateForm16ASummary(
  organizationId: string,
  supplierPan: string,
  financialYear: string,
  quarter?: "Q1" | "Q2" | "Q3" | "Q4"
): Form16ASummary[] {
  const entries = tdsLedger.getEntries(organizationId, {
    supplierPan,
    financialYear,
    quarter,
  });

  const grouped = new Map<string, TdsLedgerEntry[]>();
  for (const entry of entries) {
    const key = `${entry.sectionCode}__${entry.quarter}`;
    const list = grouped.get(key) || [];
    list.push(entry);
    grouped.set(key, list);
  }

  const summaries: Form16ASummary[] = [];
  for (const [_, groupEntries] of grouped.entries()) {
    const first = groupEntries[0];
    const totalGross = groupEntries.reduce((acc, e) => acc + e.grossAmount, 0);
    const totalTds = groupEntries.reduce((acc, e) => acc + e.tdsAmount, 0);
    const totalNet = groupEntries.reduce((acc, e) => acc + e.netPayableAmount, 0);

    summaries.push({
      organizationId,
      financialYear,
      quarter: first.quarter,
      supplierPan: first.supplierPan,
      supplierName: first.supplierName,
      sectionCode: first.sectionCode,
      totalGrossAmount: Math.round(totalGross * 100) / 100,
      totalTdsDeducted: Math.round(totalTds * 100) / 100,
      totalNetPaid: Math.round(totalNet * 100) / 100,
      transactionCount: groupEntries.length,
      entries: groupEntries,
    });
  }

  return summaries;
}

/**
 * Generates Form 26Q quarterly TDS return summary for enterprise statutory e-filing.
 */
export function generateForm26QQuarterlySummary(
  organizationId: string,
  financialYear: string,
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
): Form26QQuarterlySummary {
  const entries = tdsLedger.getEntries(organizationId, { financialYear, quarter });

  const sectionMap = new Map<string, {
    description: string;
    pans: Set<string>;
    gross: number;
    tds: number;
  }>();

  const allPans = new Set<string>();

  for (const e of entries) {
    allPans.add(e.supplierPan);
    const current = sectionMap.get(e.sectionCode) || {
      description: e.sectionDescription,
      pans: new Set<string>(),
      gross: 0,
      tds: 0,
    };
    current.pans.add(e.supplierPan);
    current.gross += e.grossAmount;
    current.tds += e.tdsAmount;
    sectionMap.set(e.sectionCode, current);
  }

  const sectionBreakdown = Array.from(sectionMap.entries()).map(([sectionCode, data]) => ({
    sectionCode,
    sectionDescription: data.description,
    deducteeCount: data.pans.size,
    grossAmount: Math.round(data.gross * 100) / 100,
    tdsAmount: Math.round(data.tds * 100) / 100,
  }));

  const totalGross = entries.reduce((acc, e) => acc + e.grossAmount, 0);
  const totalTds = entries.reduce((acc, e) => acc + e.tdsAmount, 0);

  return {
    organizationId,
    financialYear,
    quarter,
    totalDeductees: allPans.size,
    totalGrossAmount: Math.round(totalGross * 100) / 100,
    totalTdsDeducted: Math.round(totalTds * 100) / 100,
    sectionWiseBreakdown: sectionBreakdown,
  };
}
