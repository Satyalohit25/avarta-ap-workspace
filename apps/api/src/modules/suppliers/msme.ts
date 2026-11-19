/**
 * MSME 45-Day Payment Tracking & Section 43B(h) Compliance Engine (T-502)
 *
 * Implements Indian statutory compliance under:
 * 1. Micro, Small and Medium Enterprises Development (MSMED) Act, 2006 (Section 15 & 16)
 *    - Strict 45-day statutory payment ceiling with written agreement
 *    - Strict 15-day statutory payment ceiling without written agreement
 * 2. Income Tax Act 1961 - Section 43B(h)
 *    - Disallows tax deduction for expenditure payable to Micro & Small enterprises
 *      remaining unpaid at the end of the financial year (March 31) beyond the statutory limit.
 * 3. Udyam Registration Number validation (`UDYAM-XX-00-0000000`)
 */

import { calculateDueDate } from "../../workflow/due-date";

export type MsmeCategory = "MICRO" | "SMALL" | "MEDIUM" | "NON_MSME";

export interface UdyamValidationResult {
  isValid: boolean;
  normalizedUdyam: string | null;
  stateCode?: string;
  error?: string;
}

/**
 * Validates Ministry of MSME Udyam Registration Number format:
 * Pattern: `UDYAM-XX-00-0000000` (e.g. `UDYAM-MH-12-0012345`)
 * XX = 2-letter state code
 * 00 = 2-digit district/zone code
 * 0000000 = 7-digit serial registration number
 */
export function validateUdyamNumber(udyamNumber?: string | null): UdyamValidationResult {
  if (!udyamNumber || typeof udyamNumber !== "string") {
    return { isValid: false, normalizedUdyam: null, error: "Udyam registration number is required" };
  }

  const clean = udyamNumber.trim().toUpperCase();
  const udyamRegex = /^UDYAM-([A-Z]{2})-([0-9]{2})-([0-9]{7})$/;
  const match = udyamRegex.exec(clean);

  if (!match) {
    return {
      isValid: false,
      normalizedUdyam: clean,
      error: "Invalid Udyam format. Must follow standard pattern: UDYAM-XX-00-0000000 (e.g. UDYAM-MH-12-0012345)",
    };
  }

  return {
    isValid: true,
    normalizedUdyam: clean,
    stateCode: match[1],
  };
}

/**
 * Checks whether an enterprise category is protected under Section 15 of MSMED Act
 * and Section 43B(h) of the Income Tax Act.
 * NOTE: Only Micro and Small enterprises qualify. Medium enterprises are explicitly excluded.
 */
export function isMsmeProtected(category?: string | null): boolean {
  if (!category) return false;
  const upper = category.trim().toUpperCase();
  return upper === "MICRO" || upper === "SMALL";
}

export interface CalculateMsmeDueDateParams {
  invoiceDate: string; // YYYY-MM-DD
  msmeCategory?: string | null;
  hasAgreement?: boolean;
  agreedTermsDays?: number;
}

export interface MsmeDueDateResult {
  statutoryDueDate: string;
  statutoryMaxDays: number;
  isCappedByMsmeLaw: boolean;
  originalAgreedDays: number;
  ruleExplanation: string;
}

/**
 * Calculates statutory due date under Section 15 of MSMED Act:
 * - Micro & Small with agreement: strictly capped at min(agreedTerms, 45) days
 * - Micro & Small without agreement: strictly 15 days
 * - Medium & Non-MSME: standard agreed terms
 */
export function calculateMsmeDueDate(params: CalculateMsmeDueDateParams): MsmeDueDateResult {
  const { invoiceDate, msmeCategory, hasAgreement = true, agreedTermsDays = 30 } = params;

  const isProtected = isMsmeProtected(msmeCategory);

  if (!isProtected) {
    const dueDate = calculateDueDate(invoiceDate, agreedTermsDays);
    return {
      statutoryDueDate: dueDate,
      statutoryMaxDays: agreedTermsDays,
      isCappedByMsmeLaw: false,
      originalAgreedDays: agreedTermsDays,
      ruleExplanation: "Non-MSME / Medium Enterprise: Normal commercial terms apply.",
    };
  }

  const statutoryCap = hasAgreement ? 45 : 15;
  const effectiveDays = Math.min(agreedTermsDays, statutoryCap);
  const isCapped = agreedTermsDays > statutoryCap;
  const statutoryDueDate = calculateDueDate(invoiceDate, effectiveDays);

  return {
    statutoryDueDate,
    statutoryMaxDays: statutoryCap,
    isCappedByMsmeLaw: isCapped,
    originalAgreedDays: agreedTermsDays,
    ruleExplanation: hasAgreement
      ? isCapped
        ? `Section 15 MSMED Act enforced: Contractual terms (${agreedTermsDays}d) legally capped at 45 days maximum.`
        : `Statutory 45-day agreement ceiling respected (${effectiveDays} days).`
      : "Section 15 MSMED Act enforced: In the absence of written agreement, payment is legally mandated within 15 days.",
  };
}

export interface EvaluateMsmeComplianceParams {
  invoiceDate: string;
  dueDate?: string | null;
  paidDate?: string | null;
  amount: number;
  msmeCategory?: string | null;
  hasAgreement?: boolean;
  agreedTermsDays?: number;
  asOfDate?: string; // Reference date for evaluation (defaults to today)
}

export type MsmeComplianceStatus = "COMPLIANT" | "ON_TRACK" | "WARNING" | "OVERDUE" | "SETTLED_LATE";

export interface MsmeComplianceEvaluation {
  msmeCategory: MsmeCategory;
  isMsmeProtected: boolean;
  statutoryDueDate: string;
  statutoryMaxDays: number;
  isCappedByMsmeLaw: boolean;
  daysRemainingOrOverdue: number; // positive = days remaining; negative = days overdue
  status: MsmeComplianceStatus;
  statusBadgeVariant: "success" | "info" | "warning" | "destructive";
  warningMessage?: string;
  disallowanceRisk: boolean;
}

/**
 * Evaluates operational MSME compliance status for an invoice.
 */
export function evaluateMsmeCompliance(params: EvaluateMsmeComplianceParams): MsmeComplianceEvaluation {
  const {
    invoiceDate,
    paidDate,
    msmeCategory = "NON_MSME",
    hasAgreement = true,
    agreedTermsDays = 30,
    asOfDate = new Date().toISOString().split("T")[0],
  } = params;

  const category = (msmeCategory?.toUpperCase() || "NON_MSME") as MsmeCategory;
  const isProtected = isMsmeProtected(category);
  const dueDateInfo = calculateMsmeDueDate({
    invoiceDate,
    msmeCategory: category,
    hasAgreement,
    agreedTermsDays,
  });

  const refDate = new Date(asOfDate).getTime();
  const statutoryDueTime = new Date(dueDateInfo.statutoryDueDate).getTime();
  const diffDays = Math.round((statutoryDueTime - refDate) / (1000 * 60 * 60 * 24));

  if (!isProtected) {
    return {
      msmeCategory: category,
      isMsmeProtected: false,
      statutoryDueDate: dueDateInfo.statutoryDueDate,
      statutoryMaxDays: dueDateInfo.statutoryMaxDays,
      isCappedByMsmeLaw: false,
      daysRemainingOrOverdue: diffDays,
      status: "COMPLIANT",
      statusBadgeVariant: "info",
      disallowanceRisk: false,
    };
  }

  // If already paid
  if (paidDate) {
    const paidTime = new Date(paidDate).getTime();
    const paidDiffDays = Math.round((statutoryDueTime - paidTime) / (1000 * 60 * 60 * 24));
    const isLate = paidDiffDays < 0;
    return {
      msmeCategory: category,
      isMsmeProtected: true,
      statutoryDueDate: dueDateInfo.statutoryDueDate,
      statutoryMaxDays: dueDateInfo.statutoryMaxDays,
      isCappedByMsmeLaw: dueDateInfo.isCappedByMsmeLaw,
      daysRemainingOrOverdue: paidDiffDays,
      status: isLate ? "SETTLED_LATE" : "COMPLIANT",
      statusBadgeVariant: isLate ? "warning" : "success",
      warningMessage: isLate ? `Settled ${Math.abs(paidDiffDays)} days past MSME statutory due date.` : undefined,
      disallowanceRisk: false,
    };
  }

  // Unpaid invoices
  if (diffDays < 0) {
    return {
      msmeCategory: category,
      isMsmeProtected: true,
      statutoryDueDate: dueDateInfo.statutoryDueDate,
      statutoryMaxDays: dueDateInfo.statutoryMaxDays,
      isCappedByMsmeLaw: dueDateInfo.isCappedByMsmeLaw,
      daysRemainingOrOverdue: diffDays,
      status: "OVERDUE",
      statusBadgeVariant: "destructive",
      warningMessage: `CRITICAL: Overdue by ${Math.abs(diffDays)} day(s) under Section 15 of MSMED Act. Subject to Section 43B(h) tax disallowance!`,
      disallowanceRisk: true,
    };
  } else if (diffDays <= 7) {
    return {
      msmeCategory: category,
      isMsmeProtected: true,
      statutoryDueDate: dueDateInfo.statutoryDueDate,
      statutoryMaxDays: dueDateInfo.statutoryMaxDays,
      isCappedByMsmeLaw: dueDateInfo.isCappedByMsmeLaw,
      daysRemainingOrOverdue: diffDays,
      status: "WARNING",
      statusBadgeVariant: "warning",
      warningMessage: `WARNING: Only ${diffDays} day(s) remaining before statutory 45-day deadline.`,
      disallowanceRisk: false,
    };
  }

  return {
    msmeCategory: category,
    isMsmeProtected: true,
    statutoryDueDate: dueDateInfo.statutoryDueDate,
    statutoryMaxDays: dueDateInfo.statutoryMaxDays,
    isCappedByMsmeLaw: dueDateInfo.isCappedByMsmeLaw,
    daysRemainingOrOverdue: diffDays,
    status: "ON_TRACK",
    statusBadgeVariant: "info",
    disallowanceRisk: false,
  };
}

export interface SupplierMsmeProfile {
  organizationId: string;
  supplierId: string;
  supplierCode?: string;
  msmeCategory: MsmeCategory;
  udyamNumber?: string | null;
  hasWrittenAgreement: boolean;
  registrationDate?: string;
}

class SupplierMsmeStore {
  private profiles: Map<string, SupplierMsmeProfile> = new Map(); // key: `${orgId}:${supplierId}`

  private key(orgId: string, supplierId: string): string {
    return `${orgId}:${supplierId}`;
  }

  public setProfile(profile: SupplierMsmeProfile): SupplierMsmeProfile {
    this.profiles.set(this.key(profile.organizationId, profile.supplierId), profile);
    if (profile.supplierCode) {
      this.profiles.set(this.key(profile.organizationId, profile.supplierCode), profile);
    }
    return profile;
  }

  public getProfile(orgId: string, supplierIdOrCode: string): SupplierMsmeProfile | undefined {
    return this.profiles.get(this.key(orgId, supplierIdOrCode));
  }

  public listProfiles(orgId: string): SupplierMsmeProfile[] {
    const results: SupplierMsmeProfile[] = [];
    const seen = new Set<string>();
    for (const p of this.profiles.values()) {
      if (p.organizationId === orgId && !seen.has(p.supplierId)) {
        seen.add(p.supplierId);
        results.push(p);
      }
    }
    return results;
  }

  public clear(orgId?: string) {
    if (orgId) {
      for (const [key, p] of this.profiles.entries()) {
        if (p.organizationId === orgId) this.profiles.delete(key);
      }
    } else {
      this.profiles.clear();
    }
  }
}

export const supplierMsmeStore = new SupplierMsmeStore();

export interface Section43BhDisallowanceItem {
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  supplierPan?: string | null;
  udyamNumber?: string | null;
  msmeCategory: "MICRO" | "SMALL";
  invoiceDate: string;
  statutoryDueDate: string;
  amount: number;
  paidDate?: string | null;
  statusAsOfMarch31: "DISALLOWED_UNPAID" | "DISALLOWED_PAID_LATE" | "ALLOWED";
  disallowedAmount: number;
  delayDays: number;
}

export interface Section43BhReportSummary {
  financialYear: string;
  yearEndDate: string; // YYYY-03-31
  totalDisallowedAmount: number;
  disallowedInvoiceCount: number;
  impactedSuppliersCount: number;
  items: Section43BhDisallowanceItem[];
}

/**
 * Generates statutory Section 43B(h) Year-End Disallowance Audit Report.
 *
 * Evaluates invoices against Micro and Small enterprises to determine tax disallowance
 * under Section 43B(h) for expenses remaining unpaid beyond statutory 45/15 days as of March 31.
 */
export function generateSection43BhReport(params: {
  financialYear: string; // e.g. "2026-2027" or "2026-27"
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    supplierId: string;
    supplierName: string;
    supplierPan?: string | null;
    udyamNumber?: string | null;
    msmeCategory?: string | null;
    invoiceDate: string;
    amount: number;
    paidDate?: string | null;
    hasAgreement?: boolean;
    agreedTermsDays?: number;
  }>;
}): Section43BhReportSummary {
  const { financialYear, invoices } = params;

  // Determine March 31 year-end date from financialYear string (e.g. "2026-2027" -> "2027-03-31")
  const match = /(\d{4})[-/](\d{2,4})/.exec(financialYear);
  const startYear = match ? parseInt(match[1], 10) : 2026;
  const endYear = startYear + 1;
  const yearEndDate = `${endYear}-03-31`;
  const yearEndTime = new Date(yearEndDate).getTime();

  const reportItems: Section43BhDisallowanceItem[] = [];
  const impactedPans = new Set<string>();

  for (const inv of invoices) {
    if (!isMsmeProtected(inv.msmeCategory)) continue;

    const dueDateInfo = calculateMsmeDueDate({
      invoiceDate: inv.invoiceDate,
      msmeCategory: inv.msmeCategory,
      hasAgreement: inv.hasAgreement ?? true,
      agreedTermsDays: inv.agreedTermsDays ?? 45,
    });

    const statutoryDueTime = new Date(dueDateInfo.statutoryDueDate).getTime();

    // Check if invoice belongs to this financial year
    const invTime = new Date(inv.invoiceDate).getTime();
    const fyStartTime = new Date(`${startYear}-04-01`).getTime();
    if (invTime < fyStartTime || invTime > yearEndTime) {
      continue;
    }

    // Did the statutory due date fall on or before March 31?
    if (statutoryDueTime <= yearEndTime) {
      // Check payment status as of March 31
      let isDisallowed = false;
      let delayDays = 0;

      if (!inv.paidDate) {
        // Unpaid as of year-end
        isDisallowed = true;
        delayDays = Math.max(0, Math.round((yearEndTime - statutoryDueTime) / (1000 * 60 * 60 * 24)));
      } else {
        const paidTime = new Date(inv.paidDate).getTime();
        // If paid after March 31 or paid after statutory due date
        if (paidTime > statutoryDueTime && paidTime > yearEndTime) {
          isDisallowed = true;
          delayDays = Math.max(0, Math.round((paidTime - statutoryDueTime) / (1000 * 60 * 60 * 24)));
        }
      }

      if (isDisallowed) {
        const item: Section43BhDisallowanceItem = {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          supplierId: inv.supplierId,
          supplierName: inv.supplierName,
          supplierPan: inv.supplierPan,
          udyamNumber: inv.udyamNumber,
          msmeCategory: (inv.msmeCategory?.toUpperCase() || "MICRO") as "MICRO" | "SMALL",
          invoiceDate: inv.invoiceDate,
          statutoryDueDate: dueDateInfo.statutoryDueDate,
          amount: inv.amount,
          paidDate: inv.paidDate,
          statusAsOfMarch31: inv.paidDate ? "DISALLOWED_PAID_LATE" : "DISALLOWED_UNPAID",
          disallowedAmount: inv.amount,
          delayDays,
        };
        reportItems.push(item);
        impactedPans.add(inv.supplierPan || inv.supplierId);
      }
    }
  }

  const totalDisallowed = reportItems.reduce((acc, i) => acc + i.disallowedAmount, 0);

  return {
    financialYear: `FY ${startYear}-${String(endYear % 100).padStart(2, "0")}`,
    yearEndDate,
    totalDisallowedAmount: Math.round(totalDisallowed * 100) / 100,
    disallowedInvoiceCount: reportItems.length,
    impactedSuppliersCount: impactedPans.size,
    items: reportItems,
  };
}
