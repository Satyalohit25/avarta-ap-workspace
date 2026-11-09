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



export function getSupplierEnrichment(supplier: SupplierListItem): EnrichedSupplierData {
  // Derive PAN from GSTIN if valid (chars 2-12) or server-provided panNumber
  const gst = supplier.gstNumber?.trim() || "";
  const derivedPan = supplier.panNumber || (gst.length >= 12 ? gst.substring(2, 12).toUpperCase() : "Not Provided");

  const rawAccount = supplier.accountNumber || "";
  const maskedAccount = rawAccount.length > 4 
    ? `•••• •••• ${rawAccount.slice(-4)}`
    : rawAccount ? rawAccount : "Not Registered";

  return {
    category: supplier.category || "General Vendor",
    panNumber: derivedPan,
    msmeClassification: supplier.msmeStatus || "Not Registered",
    isMsme: Boolean(supplier.msmeStatus && !supplier.msmeStatus.toLowerCase().includes("not")),
    msmeRegistrationNumber: undefined,
    tdsSection: "Not Configured",
    tdsRate: "Not Configured",
    beneficiaryName: supplier.legalName || supplier.displayName,
    bankName: supplier.bankName || "Not Provided",
    accountNumber: rawAccount,
    maskedAccount,
    ifscCode: supplier.ifscCode || "Not Provided",
    settlementMethod: supplier.paymentMethod || "Not Configured",
    contactPerson: "Not Provided",
    billingEmail: supplier.email || "Not Provided",
    phone: supplier.phone || "Not Provided",
    address: supplier.address || "Not Provided",
    stpMatchRate: supplier.stpMatchRate || "N/A",
    avgTurnaroundDays: supplier.avgTurnaroundDays || "N/A",
    disputeRate: supplier.disputeRate || "Not Available",
    notes: undefined,
  };
}
