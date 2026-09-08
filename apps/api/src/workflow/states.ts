// Doc 18 §18.3 — canonical engine states. Approved/Rejected are transition
// EVENTS, not resting states, and deliberately do not appear here.
export const WORKFLOW_STATES = [
  "RECEIVED",
  "CAPTURED",
  "VALIDATING",
  "VALIDATED",
  "VALIDATION_FAILED",
  "MATCHING",
  "MATCHED",
  "MATCHING_FAILED",
  "WAITING_APPROVAL",
  "SCHEDULED",
  "PROCESSING_PAYMENT",
  "PAID",
  "ERP_SYNC",
  "ARCHIVED",
] as const;

export type WorkflowState = (typeof WORKFLOW_STATES)[number];

// Doc 18 §18.3 — projection used for invoices.status and the UI.
// Several engine states deliberately collapse onto the same label.
export const STATE_TO_INVOICE_STATUS: Record<WorkflowState, string> = {
  RECEIVED: "RECEIVED",
  CAPTURED: "PROCESSING",
  VALIDATING: "PROCESSING",
  VALIDATED: "PROCESSING",
  VALIDATION_FAILED: "EXCEPTION",
  MATCHING: "PROCESSING",
  MATCHED: "PROCESSING",
  MATCHING_FAILED: "EXCEPTION",
  WAITING_APPROVAL: "PENDING_APPROVAL",
  SCHEDULED: "SCHEDULED",
  PROCESSING_PAYMENT: "SCHEDULED",
  PAID: "PAID",
  ERP_SYNC: "SYNCED",
  ARCHIVED: "ARCHIVED",
};
