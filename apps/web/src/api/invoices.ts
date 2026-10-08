import { apiRequest } from "./client";

export interface DocumentItem {
  id: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  fileSize: number;
  createdAt: string;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  buyerInvoiceId?: string | null;
  fiscalYear?: string | null;
  erpClearingNumber?: string | null;
  supplier: { id: string; name: string } | null;
  invoiceDate?: string | null;
  dueDate: string | null;
  currency: string;
  totalAmount: string;
  purchaseOrderId?: string | null;
  status: string;
  workflowState: string;
  aiConfidence: number | null;
  openExceptionCount: number;
  source?: string;
  documents?: DocumentItem[];
}

interface ListResponse {
  data: InvoiceListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export function listInvoices(params: { status?: string; search?: string; page?: number } = {}) {
  return apiRequest<ListResponse>("/invoices", { query: params });
}

export function getNeedsAttentionInvoices(params: { status?: string; search?: string; page?: number } = {}) {
  return apiRequest<ListResponse>("/invoices/needs-attention", { query: params });
}

export interface InvoiceApprovalItem {
  id: string;
  sequenceNumber: number;
  status: string;
  comment?: string | null;
  requestedAt?: string;
  respondedAt?: string | null;
  user?: { name: string; role: string } | null;
}

export interface InvoicePaymentItem {
  id: string;
  status: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  referenceNumber?: string | null;
  utrNumber?: string | null;
  clearingDate?: string | null;
  clearingDocumentNumber?: string | null;
  scheduledDate?: string | null;
  processedAt?: string | null;
  createdAt: string;
}

export interface InvoiceWorkflowTransitionItem {
  id: string;
  fromState: string;
  toState: string;
  event: string;
  triggeredBy?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface InvoiceAuditLogItem {
  id: string;
  action: string;
  userId: string | null;
  createdAt: string;
  afterData?: unknown;
  result: string;
}

export interface InvoiceValidationItem {
  id: string;
  ruleCode?: string;
  ruleName: string;
  status: string;
  message?: string | null;
  createdAt?: string;
}

export interface InvoiceExceptionItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  type?: string;
  severity?: string;
  resolution?: string;
  createdAt?: string;
}

export function getInvoice(id: string) {
  return apiRequest<{
    data: InvoiceListItem & {
      lines: unknown[];
      validations: InvoiceValidationItem[];
      exceptions: InvoiceExceptionItem[];
      documents?: DocumentItem[];
      approvals?: InvoiceApprovalItem[];
      payments?: InvoicePaymentItem[];
      workflowTransitions?: InvoiceWorkflowTransitionItem[];
      auditLogs?: InvoiceAuditLogItem[];
    };
  }>(`/invoices/${id}`);
}

export function createInvoice(input: {
  supplierId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  currency?: string;
  subtotalAmount?: string | number;
  taxAmount?: string | number;
  totalAmount?: string | number;
  purchaseOrderId?: string;
  lines?: Array<{
    lineNumber?: number;
    description: string;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
    lineAmount: number;
  }>;
  file?: File | null;
}) {
  if (input.file) {
    const formData = new FormData();
    if (input.supplierId) formData.append("supplierId", input.supplierId);
    if (input.invoiceNumber) formData.append("invoiceNumber", input.invoiceNumber);
    if (input.invoiceDate) formData.append("invoiceDate", input.invoiceDate);
    if (input.dueDate) formData.append("dueDate", input.dueDate);
    if (input.currency) formData.append("currency", input.currency);
    if (input.subtotalAmount) formData.append("subtotalAmount", String(input.subtotalAmount));
    if (input.taxAmount) formData.append("taxAmount", String(input.taxAmount));
    if (input.totalAmount != null) formData.append("totalAmount", String(input.totalAmount));
    if (input.purchaseOrderId) formData.append("purchaseOrderId", input.purchaseOrderId);
    if (input.lines && input.lines.length > 0) {
      formData.append("lines", JSON.stringify(input.lines));
    }
    formData.append("file", input.file);

    return apiRequest<{ data: InvoiceListItem }>("/invoices", {
      method: "POST",
      body: formData,
    });
  }

  return apiRequest<{ data: InvoiceListItem }>("/invoices", {
    method: "POST",
    body: {
      supplierId: input.supplierId || undefined,
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate || undefined,
      dueDate: input.dueDate || undefined,
      currency: input.currency,
      subtotalAmount: input.subtotalAmount,
      taxAmount: input.taxAmount,
      totalAmount: input.totalAmount,
      purchaseOrderId: input.purchaseOrderId || undefined,
      lines: input.lines,
    },
  });
}

export function updateInvoice(
  id: string,
  input: {
    supplierId?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    currency?: string;
    subtotalAmount?: string | number;
    taxAmount?: string | number;
    totalAmount?: string | number;
    purchaseOrderId?: string;
    lines?: Array<{
      lineNumber?: number;
      description: string;
      quantity: number;
      unitPrice: number;
      taxAmount?: number;
      lineAmount: number;
    }>;
  }
) {
  return apiRequest<{ data: InvoiceListItem }>(`/invoices/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function processInvoice(id: string, idempotencyKey?: string) {
  return apiRequest<{ data: InvoiceListItem }>(`/invoices/${id}/process`, {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
}

export function transitionInvoice(id: string, action: string, comment?: string) {
  return apiRequest<{ data: InvoiceListItem }>(`/invoices/${id}/transitions`, {
    method: "POST",
    body: { action, comment },
  });
}

export function syncInvoiceToErp(id: string, targetErp: string) {
  return apiRequest<{ data: InvoiceListItem }>(`/invoices/${id}/erp-sync`, {
    method: "POST",
    body: { targetErp },
  });
}

export interface ExtractedDocumentData {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  currency?: string;
  totalAmount?: number;
  subtotal?: number;
  taxAmount?: number;
  supplier?: { name: string; address?: string; gstin?: string; country?: string; phone?: string; email?: string };
  purchaseOrderNumber?: string;
  lines?: Array<{
    lineNumber?: number;
    description: string;
    quantity: number;
    unitPrice: number;
    lineAmount: number;
    hsnSacCode?: string;
    taxRate?: number;
  }>;
  overallConfidence?: number;
  fieldBoundingBoxes?: Record<string, { pageNumber?: number; x: number; y: number; width: number; height: number }>;
}

export function extractInvoiceDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<{ data: ExtractedDocumentData }>("/invoices/extract", {
    method: "POST",
    body: formData,
  });
}

export function uploadInvoiceDocument(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<{ data: DocumentItem; invoice?: InvoiceListItem }>(`/invoices/${id}/documents`, {
    method: "POST",
    body: formData,
  });
}

export function resolveException(exceptionId: string, resolution: string) {
  return apiRequest<{ data: unknown }>(`/exceptions/${exceptionId}/resolve`, {
    method: "POST",
    body: { resolution },
  });
}


