/**
 * Canonical UI shape for an invoice line as rendered by the matching table.
 * Values originate from the invoice record, never from a generated catalogue.
 */
export interface LineItemData {
  id: string;
  lineNumber: number;
  description: string;
  hsnCode?: string;
  poQty: number;
  invQty: number;
  quantity: number;
  poUnitPrice: number;
  invUnitPrice: number;
  unitPrice: number; // Unit rate excl. GST
  taxableAmount: number; // Line taxable subtotal
  taxRate: number; // GST rate percentage (e.g. 18%)
  taxAmount: number; // Line tax amount (18% of taxable)
  lineAmount: number; // Line total incl. GST
  currency: string;
  status: "MATCHED" | "PRICE_VARIANCE" | "QTY_VARIANCE";
  overrideAccepted?: boolean;
  overrideReason?: string;
}
