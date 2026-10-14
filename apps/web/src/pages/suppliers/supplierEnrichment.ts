import { SupplierListItem } from "../../api/suppliers";

export interface EnrichedSupplierData {
  category: string;
  panNumber: string;
  msmeClassification: string;
  isMsme: boolean;
  msmeRegistrationNumber?: string;
  tdsSection: string;
  tdsRate: string;
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  maskedAccount: string;
  ifscCode: string;
  settlementMethod: string;
  contactPerson: string;
  billingEmail: string;
  phone: string;
  address: string;
  stpMatchRate: string;
  avgTurnaroundDays: string;
  disputeRate: string;
  notes?: string;
}

const STORAGE_KEY = "avarta_custom_supplier_meta";

export function getCustomSupplierMeta(supplierCodeOrId: string): Partial<EnrichedSupplierData> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed[supplierCodeOrId] || null;
  } catch {
    return null;
  }
}

export function saveCustomSupplierMeta(supplierCodeOrId: string, data: Partial<EnrichedSupplierData>) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[supplierCodeOrId] = { ...parsed[supplierCodeOrId], ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

export function getSupplierEnrichment(supplier: SupplierListItem): EnrichedSupplierData {
  const custom = getCustomSupplierMeta(supplier.supplierCode) || getCustomSupplierMeta(supplier.id);

  // Derive PAN from GSTIN if valid (chars 2-12) or server-provided panNumber
  const gst = supplier.gstNumber?.trim() || "";
  const derivedPan = supplier.panNumber || (gst.length >= 12 ? gst.substring(2, 12).toUpperCase() : "Not Provided");

  const rawAccount = custom?.accountNumber || supplier.accountNumber || "";
  const maskedAccount = rawAccount.length > 4 
    ? `•••• •••• ${rawAccount.slice(-4)}`
    : rawAccount ? rawAccount : "Not Registered";

  return {
    category: custom?.category || supplier.category || "General Vendor",
    panNumber: custom?.panNumber || derivedPan,
    msmeClassification: custom?.msmeClassification || supplier.msmeStatus || "Not Registered",
    isMsme: custom?.isMsme ?? Boolean(supplier.msmeStatus && !supplier.msmeStatus.toLowerCase().includes("not")),
    msmeRegistrationNumber: custom?.msmeRegistrationNumber || (supplier.msmeStatus ? "Verified" : undefined),
    tdsSection: custom?.tdsSection || "194C - Contractor & Supplies",
    tdsRate: custom?.tdsRate || "1.0%",
    beneficiaryName: custom?.beneficiaryName || supplier.legalName || supplier.displayName,
    bankName: custom?.bankName || supplier.bankName || "Not Provided",
    accountNumber: rawAccount,
    maskedAccount,
    ifscCode: custom?.ifscCode || supplier.ifscCode || "Not Provided",
    settlementMethod: custom?.settlementMethod || supplier.paymentMethod || "NEFT / RTGS Bank Transfer",
    contactPerson: custom?.contactPerson || "Primary AP Contact",
    billingEmail: custom?.billingEmail || supplier.email || "Not Provided",
    phone: custom?.phone || supplier.phone || "Not Provided",
    address: custom?.address || supplier.address || "Not Provided",
    stpMatchRate: custom?.stpMatchRate || supplier.stpMatchRate || "N/A",
    avgTurnaroundDays: custom?.avgTurnaroundDays || supplier.avgTurnaroundDays || "N/A",
    disputeRate: custom?.disputeRate || supplier.disputeRate || "0.0%",
    notes: custom?.notes,
  };
}
