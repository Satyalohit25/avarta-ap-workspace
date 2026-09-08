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

  // Derive default category based on supplier name
  const nameLower = (supplier.displayName || supplier.legalName || "").toLowerCase();
  let defaultCategory = "Industrial MRO & Tooling";
  let defaultMsmeClass = "Small Enterprise (45-Day Prompt Payment)";
  let defaultBank = "HDFC Bank Commercial Banking";
  let defaultIfsc = "HDFC0000240";
  let defaultTds = "194C - Contractor & Supplies";
  let defaultTdsRate = "1.0%";

  if (nameLower.includes("steel") || nameLower.includes("metal") || nameLower.includes("iron")) {
    defaultCategory = "Raw Materials & Metals";
    defaultMsmeClass = "Not Applicable (Large Enterprise)";
    defaultBank = "State Bank of India (Corporate Banking Branch)";
    defaultIfsc = "SBIN0000300";
    defaultTds = "194Q - Purchase of Goods";
    defaultTdsRate = "0.1%";
  } else if (nameLower.includes("tech") || nameLower.includes("soft") || nameLower.includes("infosys") || nameLower.includes("it")) {
    defaultCategory = "IT Software & Cloud Services";
    defaultMsmeClass = "Not Applicable (Large Corporate)";
    defaultBank = "ICICI Bank (Electronic City Branch)";
    defaultIfsc = "ICIC0000047";
    defaultTds = "194J - Professional & Technical";
    defaultTdsRate = "10.0%";
  } else if (nameLower.includes("logistics") || nameLower.includes("freight") || nameLower.includes("transport")) {
    defaultCategory = "Logistics & Freight Transportation";
    defaultMsmeClass = "Medium Enterprise";
    defaultBank = "Axis Bank (Logistics Hub Branch)";
    defaultIfsc = "UTIB0001089";
    defaultTds = "194C - Transport & Freight";
    defaultTdsRate = "1.0%";
  } else if (nameLower.includes("clean") || nameLower.includes("facility") || nameLower.includes("security")) {
    defaultCategory = "Facilities & Commercial Utilities";
    defaultMsmeClass = "Micro Enterprise (< ₹1 Cr)";
    defaultBank = "Kotak Mahindra Bank";
    defaultIfsc = "KKBK0000450";
    defaultTds = "194C - Service Contractor";
    defaultTdsRate = "1.0%";
  }

  // Derive PAN from GSTIN if valid (chars 2-12)
  const gst = supplier.gstNumber?.trim() || "";
  const derivedPan = gst.length >= 12 ? gst.substring(2, 12).toUpperCase() : "AAACU9603R";

  const cleanDomain = (supplier.displayName || "vendor")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 15);

  const rawAccount = custom?.accountNumber || supplier.accountNumber || "50200049281726";
  const maskedAccount = rawAccount.length > 4 
    ? `•••• •••• ${rawAccount.slice(-4)}`
    : `•••• •••• 8842`;

  return {
    category: custom?.category || supplier.category || defaultCategory,
    panNumber: custom?.panNumber || supplier.panNumber || derivedPan,
    msmeClassification: custom?.msmeClassification || supplier.msmeStatus || defaultMsmeClass,
    isMsme: custom?.isMsme ?? (!defaultMsmeClass.includes("Not Applicable")),
    msmeRegistrationNumber: custom?.msmeRegistrationNumber || `UDYAM-MH-12-00${supplier.supplierCode.slice(-4) || "4892"}`,
    tdsSection: custom?.tdsSection || defaultTds,
    tdsRate: custom?.tdsRate || defaultTdsRate,
    beneficiaryName: custom?.beneficiaryName || supplier.legalName || supplier.displayName,
    bankName: custom?.bankName || supplier.bankName || defaultBank,
    accountNumber: rawAccount,
    maskedAccount,
    ifscCode: custom?.ifscCode || supplier.ifscCode || defaultIfsc,
    settlementMethod: custom?.settlementMethod || supplier.paymentMethod || "NEFT / RTGS Direct Bank Transfer",
    contactPerson: custom?.contactPerson || "Finance & AP Team",
    billingEmail: custom?.billingEmail || supplier.email || `ap.billing@${cleanDomain || "vendor"}.com`,
    phone: custom?.phone || supplier.phone || "+91 (020) 2740-8800",
    address: custom?.address || supplier.address || "Plot 42, Hinjewadi Phase II, Chakan MIDC Industrial Corridor, Pune 411501",
    stpMatchRate: custom?.stpMatchRate || "89.5%",
    avgTurnaroundDays: custom?.avgTurnaroundDays || "2.4 Days",
    disputeRate: custom?.disputeRate || "3.8%",
    notes: custom?.notes,
  };
}
