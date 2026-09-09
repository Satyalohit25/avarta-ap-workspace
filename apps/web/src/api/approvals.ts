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

export function approveApproval(approvalId: string, notes?: string) {
  return apiRequest<{ success: boolean; data: any }>(`/approvals/${approvalId}/approve`, {
    method: "POST",
    body: { notes },
  });
}

export function rejectApproval(approvalId: string, reason: string) {
  return apiRequest<{ success: boolean; data: any }>(`/approvals/${approvalId}/reject`, {
    method: "POST",
    body: { reason },
  });
}
