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

export function executePayment(paymentId: string, details?: { utrNumber?: string; clearingDocumentNumber?: string }) {
  return apiRequest<{ data: PaymentRow }>(`/payments/${paymentId}/execute`, {
    method: "POST",
    body: details,
  });
}
