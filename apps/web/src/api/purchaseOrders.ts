import { apiRequest } from "./client";

export interface PoLineItem {
  id: string;
  itemNumber: number;
  description: string;
  hsnSac: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  lineTotal: number;
}

export interface GoodsReceiptLineItem {
  id: string;
  lineNumber: number;
  description: string;
  itemCode?: string | null;
  receivedQuantity: number; // can be negative for returned goods per Tata Chemicals
  unitOfMeasure: string;
  status: string;
  inspectionNotes?: string | null;
}

export interface GoodsReceiptItem {
  id: string;
  grnNumber: string;
  receiptDate: string;
  vendorDeliveryNote?: string | null;
  status: string;
  comments?: string | null;
  lines: GoodsReceiptLineItem[];
}

export interface PurchaseOrderItem {
  id: string;
  poNumber: string;
  supplierId: string;
  vendor: string;
  currency: string;
  totalAmount: string;
  utilizedAmount: string;
  remainingAmount: string;
  status: string;
  closedForReceiving?: boolean;
  matchingStatus: string;
  issueDate: string;
  createdAt: string;
  linkedInvoicesCount: number;
  goodsReceiptsCount?: number;
  poType?: string;
  costCenter?: string;
  deliveryLocation?: string;
  expectedDeliveryDate?: string;
  matchingTolerance?: string;
  paymentTerms?: string;
  incoterms?: string;
  lineItems?: PoLineItem[];
  notes?: string;
}

export interface PurchaseOrderDetail extends PurchaseOrderItem {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    status: string;
  }>;
  goodsReceipts?: GoodsReceiptItem[];
}

export function listPurchaseOrders(params: { search?: string; status?: string } = {}) {
  return apiRequest<{ data: PurchaseOrderItem[]; meta: unknown }>("/purchase-orders", { query: params });
}

export function getPurchaseOrder(poId: string) {
  return apiRequest<{ data: PurchaseOrderDetail }>(`/purchase-orders/${poId}`);
}

export function togglePoReceiving(poId: string, closed: boolean) {
  return apiRequest<{ data: PurchaseOrderDetail }>(`/purchase-orders/${poId}/receiving`, {
    method: "POST",
    body: { closed },
  });
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  poNumber: string;
  currency?: string;
  totalAmount: string | number;
  issueDate?: string;
  expectedDeliveryDate?: string;
  poType?: string;
  costCenter?: string;
  deliveryLocation?: string;
  matchingTolerance?: string;
  paymentTerms?: string;
  incoterms?: string;
  lineItems?: PoLineItem[];
  notes?: string;
}

export function createPurchaseOrder(data: CreatePurchaseOrderInput) {
  return apiRequest<{ data: PurchaseOrderItem }>("/purchase-orders", {
    method: "POST",
    body: data,
  });
}

export function recordGoodsReceipt(poId: string, data: {
  grnNumber: string;
  vendorDeliveryNote?: string;
  comments?: string;
  status?: string;
  lines: Array<{
    lineNumber: number;
    description: string;
    itemCode?: string;
    receivedQuantity: number;
    unitOfMeasure?: string;
    status?: string;
    inspectionNotes?: string;
  }>;
}) {
  return apiRequest<{ data: unknown }>(`/purchase-orders/${poId}/grn`, {
    method: "POST",
    body: data,
  });
}

