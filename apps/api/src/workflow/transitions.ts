import { WorkflowState } from "./states";

export type WorkflowEvent =
  | "CAPTURE_COMPLETE"
  | "VALIDATION_START"
  | "VALIDATION_SUCCESS"
  | "VALIDATION_FAILURE"
  | "MATCHING_START"
  | "EXCEPTION_RESOLVED"
  | "MATCHING_SUCCESS"
  | "MATCHING_FAILURE"
  | "APPROVED"
  | "REJECTED"
  | "PAYMENT_RUN"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILURE"
  | "ERP_SUCCESS"
  | "ARCHIVE_COMPLETE";

interface TransitionRule {
  from: WorkflowState;
  event: WorkflowEvent;
  to: WorkflowState;
}

// Doc 18 §18.3 — the corrected transition table, filling the gap left in
// the original Doc 09 spec (Matching / Matching Failed rows were missing).
export const TRANSITIONS: TransitionRule[] = [
  { from: "RECEIVED", event: "CAPTURE_COMPLETE", to: "CAPTURED" },
  { from: "CAPTURED", event: "VALIDATION_START", to: "VALIDATING" },
  { from: "VALIDATING", event: "VALIDATION_SUCCESS", to: "VALIDATED" },
  { from: "VALIDATING", event: "VALIDATION_FAILURE", to: "VALIDATION_FAILED" },
  { from: "VALIDATED", event: "MATCHING_START", to: "MATCHING" },
  { from: "VALIDATION_FAILED", event: "EXCEPTION_RESOLVED", to: "VALIDATED" },
  { from: "MATCHING", event: "MATCHING_SUCCESS", to: "WAITING_APPROVAL" },
  { from: "MATCHING", event: "MATCHING_FAILURE", to: "MATCHING_FAILED" },
  { from: "MATCHING_FAILED", event: "EXCEPTION_RESOLVED", to: "VALIDATED" },
  { from: "WAITING_APPROVAL", event: "APPROVED", to: "SCHEDULED" },
  { from: "WAITING_APPROVAL", event: "REJECTED", to: "VALIDATION_FAILED" },
  { from: "SCHEDULED", event: "PAYMENT_RUN", to: "PROCESSING_PAYMENT" },
  { from: "PROCESSING_PAYMENT", event: "PAYMENT_SUCCESS", to: "PAID" },
  // Doc 18 §18.5 — engine state reverts to Scheduled on payment failure so
  // the invoice remains retry-eligible; the specific Payment row keeps its
  // own FAILED status + failure_reason (see modules/payments), which is
  // where the failure is actually surfaced to the user.
  { from: "PROCESSING_PAYMENT", event: "PAYMENT_FAILURE", to: "SCHEDULED" },
  { from: "PAID", event: "ERP_SUCCESS", to: "ERP_SYNC" },
  { from: "ERP_SYNC", event: "ARCHIVE_COMPLETE", to: "ARCHIVED" },
];

export function findTransition(from: WorkflowState, event: WorkflowEvent): TransitionRule | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.event === event);
}

export function availableEvents(from: WorkflowState): WorkflowEvent[] {
  return TRANSITIONS.filter((t) => t.from === from).map((t) => t.event);
}
