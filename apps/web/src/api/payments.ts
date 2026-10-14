import { apiRequest } from "./client";

export interface PaymentRow {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  vendor: string;
  amount: string;
  currency: string;
  dueDate: string | null;
  status: string;
  method: string;
  utrNumber?: string | null;
  clearingDate?: string | null;
  clearingDocumentNumber?: string | null;
}

export function listPayments() {
  return apiRequest<{ data: PaymentRow[] }>("/payments");
}

export function executePayment(
  paymentId: string,
  details?: { utrNumber?: string; clearingDocumentNumber?: string },
  idempotencyKey?: string
) {
  const key = idempotencyKey || `pay-${paymentId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return apiRequest<{ data: PaymentRow }>(`/payments/${paymentId}/execute`, {
    method: "POST",
    body: details,
    headers: { "Idempotency-Key": key },
  });
}

export function runBatchPayments(
  body?: { paymentIds?: string[]; cutoffDate?: string },
  idempotencyKey?: string
) {
  const key = idempotencyKey || `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return apiRequest<{ data: { totalProcessed: number; succeeded: number; failed: number } }>("/payments/batch/run", {
    method: "POST",
    body,
    headers: { "Idempotency-Key": key },
  });
}
