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
  matchingStatus: string;
  issueDate: string;
  createdAt: string;
  linkedInvoicesCount: number;
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
}

export function listPurchaseOrders(params: { search?: string; status?: string } = {}) {
  return apiRequest<{ data: PurchaseOrderItem[]; meta: unknown }>("/purchase-orders", { query: params });
}

export function getPurchaseOrder(poId: string) {
  return apiRequest<{ data: PurchaseOrderDetail }>(`/purchase-orders/${poId}`);
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

