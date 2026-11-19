import { apiRequest } from "./client";
import { notifyMutation } from "../lib/events";

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
  settlementDate?: string | null;
  clearingDocumentNumber?: string | null;
}

export function listPayments() {
  return apiRequest<{ data: PaymentRow[] }>("/payments");
}

export async function executePayment(
  paymentId: string,
  details?: { utrNumber?: string; settlementDate?: string; clearingDocumentNumber?: string },
  idempotencyKey?: string
) {
  const key = idempotencyKey || `pay-${paymentId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const result = await apiRequest<{ data: PaymentRow }>(`/payments/${paymentId}/execute`, {
    method: "POST",
    body: details,
    headers: { "Idempotency-Key": key },
  });
  notifyMutation("payments");
  return result;
}

export async function retryPayment(paymentId: string, idempotencyKey?: string) {
  const key = idempotencyKey || `retry-pay-${paymentId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const result = await apiRequest<{ data: PaymentRow }>(`/payments/${paymentId}/retry`, {
    method: "POST",
    headers: { "Idempotency-Key": key },
  });
  notifyMutation("payments");
  return result;
}

export async function runBatchPayments(
  body?: { paymentIds?: string[]; cutoffDate?: string },
  idempotencyKey?: string
) {
  const key = idempotencyKey || `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const result = await apiRequest<{ data: { totalProcessed: number; succeeded: number; failed: number } }>("/payments/batch/run", {
    method: "POST",
    body,
    headers: { "Idempotency-Key": key },
  });
  notifyMutation("payments");
  return result;
}
