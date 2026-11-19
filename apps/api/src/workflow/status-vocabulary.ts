/**
 * Avarta AP Workspace — Canonical Status Vocabulary
 * Traces to AGENTS.md §Non-negotiable product rules and §Canonical vocabulary.
 *
 * Engine states (workflow_instances.current_state):
 *   RECEIVED, CAPTURED, VALIDATING, VALIDATED, VALIDATION_FAILED, MATCHING,
 *   MATCHED, MATCHING_FAILED, WAITING_APPROVAL, SCHEDULED, PROCESSING_PAYMENT,
 *   PAID, ERP_SYNC, ARCHIVED
 *
 * Invoice UI projection (invoices.status):
 *   RECEIVED, PROCESSING, EXCEPTION, PENDING_APPROVAL, APPROVED, REJECTED,
 *   SCHEDULED, PAID, SYNCED, ARCHIVED
 *   Note: APPROVED and REJECTED are transition events, NOT resting states produced by the engine.
 *
 * Payment status (payments.status):
 *   AWAITING_SCHEDULE, SCHEDULED, PROCESSING, PAID, FAILED, ON_HOLD
 *
 * Purchase Order status (PurchaseOrder.status):
 *   OPEN, CLOSED_FOR_RECEIVING, CLOSED, CANCELLED
 */

import { WorkflowState, WORKFLOW_STATES, STATE_TO_INVOICE_STATUS } from "./states";

export { WorkflowState, WORKFLOW_STATES, STATE_TO_INVOICE_STATUS };

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

/**
 * Reachable resting statuses projected by the Workflow Engine onto invoices.status.
 * APPROVED and REJECTED are transition events and never resting projection states.
 */
export const REACHABLE_INVOICE_STATUSES = Array.from(
  new Set(Object.values(STATE_TO_INVOICE_STATUS))
) as InvoiceStatus[];

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

/**
 * Derives whether a Purchase Order is closed for receiving.
 * PurchaseOrder.status is the single source of truth.
 */
export function isPoClosedForReceiving(po: {
  status?: string | null;
  closedForReceiving?: boolean | null;
}): boolean {
  const norm = po.status?.toUpperCase();
  return norm === "CLOSED_FOR_RECEIVING" || norm === "CLOSED" || Boolean(po.closedForReceiving);
}
