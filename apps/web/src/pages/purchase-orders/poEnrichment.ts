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

// Generates realistic default line items if none were explicitly saved
function generateDefaultLineItems(po: PurchaseOrderItem): PoLineItem[] {
  const total = Number(po.totalAmount) || 50000;
  const vendorLower = (po.vendor || "").toLowerCase();

  if (vendorLower.includes("steel") || vendorLower.includes("metal")) {
    const p1 = Math.round(total * 0.65);
    const p2 = total - p1;
    return [
      {
        id: "line-1",
        itemNumber: 1,
        description: "High-Tensile Cold Rolled Steel Coils (Grade IS 2062)",
        hsnSac: "720916",
        quantity: 25,
        unitOfMeasure: "MT",
        unitPrice: Math.round(p1 / 25),
        lineTotal: p1,
      },
      {
        id: "line-2",
        itemNumber: 2,
        description: "Galvanized Sheet Slit Strips 2.0mm Thickness",
        hsnSac: "721049",
        quantity: 10,
        unitOfMeasure: "MT",
        unitPrice: Math.round(p2 / 10),
        lineTotal: p2,
      },
    ];
  }

  if (vendorLower.includes("tech") || vendorLower.includes("soft") || vendorLower.includes("infosys")) {
    const p1 = Math.round(total * 0.7);
    const p2 = total - p1;
    return [
      {
        id: "line-1",
        itemNumber: 1,
        description: "Enterprise Cloud Infrastructure & Platform License (Q3)",
        hsnSac: "998313",
        quantity: 1,
        unitOfMeasure: "Lots",
        unitPrice: p1,
        lineTotal: p1,
      },
      {
        id: "line-2",
        itemNumber: 2,
        description: "Senior ERP Systems Integration & Engineering Retainer",
        hsnSac: "998314",
        quantity: 80,
        unitOfMeasure: "Hours",
        unitPrice: Math.round(p2 / 80),
        lineTotal: p2,
      },
    ];
  }

  if (vendorLower.includes("logistics") || vendorLower.includes("freight")) {
    return [
      {
        id: "line-1",
        itemNumber: 1,
        description: "Inter-State Freight & Container Transport (Pune to Bhiwandi)",
        hsnSac: "996511",
        quantity: 12,
        unitOfMeasure: "Trips",
        unitPrice: Math.round(total / 12),
        lineTotal: total,
      },
    ];
  }

  // Default MRO / Industrial Supplies
  const p1 = Math.round(total * 0.6);
  const p2 = total - p1;
  return [
    {
      id: "line-1",
      itemNumber: 1,
      description: "Precision CNC Carbide Milling Inserts & Toolholders",
      hsnSac: "820780",
      quantity: 50,
      unitOfMeasure: "Pcs",
      unitPrice: Math.round(p1 / 50),
      lineTotal: p1,
    },
    {
      id: "line-2",
      itemNumber: 2,
      description: "Heavy Duty Industrial Ball Bearings (Series 6208-2RS)",
      hsnSac: "848210",
      quantity: 40,
      unitOfMeasure: "Pcs",
      unitPrice: Math.round(p2 / 40),
      lineTotal: p2,
    },
  ];
}

export function getPoEnrichment(po: PurchaseOrderItem): EnrichedPoData {
  const custom = getCustomPoMeta(po.poNumber) || getCustomPoMeta(po.id);

  const totalNum = Number(po.totalAmount) || 0;
  const lineItems = custom?.lineItems && custom.lineItems.length > 0 
    ? custom.lineItems 
    : generateDefaultLineItems(po);

  const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.lineTotal) || 0), 0) || totalNum;
  const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;

  // Expected delivery date default: 21 days after issueDate or createdAt
  const baseDate = po.issueDate ? new Date(po.issueDate) : (po.createdAt ? new Date(po.createdAt) : new Date());
  const deliveryDateObj = new Date(baseDate.getTime() + 21 * 24 * 60 * 60 * 1000);
  const defaultDeliveryDate = deliveryDateObj.toISOString().slice(0, 10);

  return {
    poType: custom?.poType || po.poType || "Standard Purchase Order",
    costCenter: custom?.costCenter || po.costCenter || "CC-104 Plant Operations Pune",
    deliveryLocation: custom?.deliveryLocation || po.deliveryLocation || "Warehouse WH-1 (Chakan Industrial Zone, Pune)",
    expectedDeliveryDate: custom?.expectedDeliveryDate || po.expectedDeliveryDate || defaultDeliveryDate,
    incoterms: custom?.incoterms || po.incoterms || "CIF - Door Delivery (Cost, Insurance & Freight)",
    paymentTerms: custom?.paymentTerms || po.paymentTerms || "Net 30 Days",
    matchingTolerance: custom?.matchingTolerance || po.matchingTolerance || "Standard Commercial (2.5% Tolerance)",
    tolerancePct: 2.5,
    lineItems,
    subtotal,
    taxAmount,
    notes: custom?.notes || po.notes || "Strict QA inspection at Gate 3. Original test certifications and delivery challan must accompany consignment.",
  };
}
