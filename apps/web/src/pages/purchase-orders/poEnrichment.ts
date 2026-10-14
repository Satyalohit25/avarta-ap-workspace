import { PurchaseOrderItem, PoLineItem } from "../../api/purchaseOrders";

export interface EnrichedPoData {
  poType: string;
  costCenter: string;
  deliveryLocation: string;
  expectedDeliveryDate: string;
  incoterms: string;
  paymentTerms: string;
  matchingTolerance: string;
  tolerancePct: number;
  lineItems: PoLineItem[];
  subtotal: number;
  taxAmount: number;
  notes?: string;
}

const STORAGE_KEY = "avarta_custom_po_meta";

export function getCustomPoMeta(poNumberOrId: string): Partial<EnrichedPoData> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed[poNumberOrId] || null;
  } catch {
    return null;
  }
}

export function saveCustomPoMeta(poNumberOrId: string, data: Partial<EnrichedPoData>) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[poNumberOrId] = { ...parsed[poNumberOrId], ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

export function getPoEnrichment(po: PurchaseOrderItem): EnrichedPoData {
  const custom = getCustomPoMeta(po.poNumber) || getCustomPoMeta(po.id);

  const totalNum = Number(po.totalAmount) || 0;
  const lineItems = (custom?.lineItems && custom.lineItems.length > 0)
    ? custom.lineItems
    : (po.lineItems && po.lineItems.length > 0)
    ? po.lineItems
    : [];

  const subtotal = lineItems.length > 0
    ? lineItems.reduce((acc, item) => acc + (Number(item.lineTotal) || 0), 0)
    : totalNum;
  const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;

  return {
    poType: custom?.poType || po.poType || "Standard Purchase Order",
    costCenter: custom?.costCenter || po.costCenter || "Direct Procurement",
    deliveryLocation: custom?.deliveryLocation || po.deliveryLocation || "Receiving Facility",
    expectedDeliveryDate: custom?.expectedDeliveryDate || po.expectedDeliveryDate || (po.issueDate ? po.issueDate.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    incoterms: custom?.incoterms || po.incoterms || "Standard Commercial Terms",
    paymentTerms: custom?.paymentTerms || po.paymentTerms || "Net 30 Days",
    matchingTolerance: custom?.matchingTolerance || po.matchingTolerance || "Standard Commercial (2.5% Tolerance)",
    tolerancePct: 2.5,
    lineItems,
    subtotal,
    taxAmount,
    notes: custom?.notes || po.notes,
  };
}
