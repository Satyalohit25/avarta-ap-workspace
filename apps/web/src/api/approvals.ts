import { apiRequest } from "./client";
import { notifyMutation } from "../lib/events";

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

export async function approveApproval(approvalId: string, notes?: string) {
  const res = await apiRequest<{ success: boolean; data: unknown }>(`/approvals/${approvalId}/approve`, {
    method: "POST",
    body: { notes },
  });
  notifyMutation("approvals");
  return res;
}

export async function rejectApproval(approvalId: string, reason: string) {
  const res = await apiRequest<{ success: boolean; data: unknown }>(`/approvals/${approvalId}/reject`, {
    method: "POST",
    body: { reason },
  });
  notifyMutation("approvals");
  return res;
}

export interface BulkApproveResult {
  processed: number;
  succeeded: string[];
  failed: Array<{ invoiceId: string; reason: string }>;
}

export async function bulkApprove(invoiceIds: string[], notes?: string, idempotencyKey?: string) {
  const res = await apiRequest<{ data: BulkApproveResult }>("/approvals/bulk-approve", {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    body: { invoiceIds, notes },
  });
  notifyMutation("approvals");
  return res;
}
