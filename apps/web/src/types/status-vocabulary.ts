/**
 * Avarta AP Workspace — Canonical Status Vocabulary
 * Mirrors apps/api/src/workflow/status-vocabulary.ts
 * Traces to AGENTS.md §Non-negotiable product rules and §Canonical vocabulary.
 */

export const ALL_INVOICE_STATUSES = [
  "RECEIVED",
  "PROCESSING",
  "EXCEPTION",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "SCHEDULED",
  "PAID",
  "SYNCED",
  "ARCHIVED",
] as const;

export type InvoiceStatus = (typeof ALL_INVOICE_STATUSES)[number];

export const REACHABLE_INVOICE_STATUSES: InvoiceStatus[] = [
  "RECEIVED",
  "PROCESSING",
  "EXCEPTION",
  "PENDING_APPROVAL",
  "SCHEDULED",
  "PAID",
  "SYNCED",
  "ARCHIVED",
];

export const ALL_PAYMENT_STATUSES = [
  "AWAITING_SCHEDULE",
  "SCHEDULED",
  "PROCESSING",
  "PAID",
  "FAILED",
  "ON_HOLD",
] as const;

export type PaymentStatus = (typeof ALL_PAYMENT_STATUSES)[number];

export const ALL_PURCHASE_ORDER_STATUSES = [
  "OPEN",
  "CLOSED_FOR_RECEIVING",
  "CLOSED",
  "CANCELLED",
] as const;

export type PurchaseOrderStatus = (typeof ALL_PURCHASE_ORDER_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  RECEIVED: "Received",
  PROCESSING: "Processing",
  EXCEPTION: "Exception",
  PENDING_APPROVAL: "Waiting Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SCHEDULED: "Scheduled",
  PAID: "Paid",
  SYNCED: "Synced",
  ARCHIVED: "Archived",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  AWAITING_SCHEDULE: "Awaiting Schedule",
  SCHEDULED: "Scheduled",
  PROCESSING: "Processing",
  PAID: "Paid / Cleared",
  FAILED: "Failed",
  ON_HOLD: "On Hold",
};

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  OPEN: "Open",
  CLOSED_FOR_RECEIVING: "Closed for Receiving",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export function isPoClosedForReceiving(po: {
  status?: string | null;
  closedForReceiving?: boolean | null;
}): boolean {
  const norm = po.status?.toUpperCase();
  return norm === "CLOSED_FOR_RECEIVING" || norm === "CLOSED" || Boolean(po.closedForReceiving);
}
