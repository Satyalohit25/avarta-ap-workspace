import { apiRequest } from "./client";

export interface ApprovalRow {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  vendor: string;
  amount: string;
  currency?: string;
  dueDate: string | null;
  status: string;
  requestedAt?: string;
}

export function listApprovals() {
  return apiRequest<{ data: ApprovalRow[] }>("/approvals");
}
