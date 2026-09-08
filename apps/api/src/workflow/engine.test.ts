import { describe, expect, it } from "vitest";
import { findTransition, WorkflowEvent } from "./transitions";
import { STATE_TO_INVOICE_STATUS, WorkflowState } from "./states";

describe("Workflow Engine Exhaustive State Matrix & Authority", () => {
  it("verifies the complete happy-path state matrix", () => {
    const sequence: { from: WorkflowState; event: WorkflowEvent; expectedTo: WorkflowState }[] = [
      { from: "RECEIVED", event: "CAPTURE_COMPLETE", expectedTo: "CAPTURED" },
      { from: "CAPTURED", event: "VALIDATION_START", expectedTo: "VALIDATING" },
      { from: "VALIDATING", event: "VALIDATION_SUCCESS", expectedTo: "VALIDATED" },
      { from: "VALIDATED", event: "MATCHING_START", expectedTo: "MATCHING" },
      { from: "MATCHING", event: "MATCHING_SUCCESS", expectedTo: "WAITING_APPROVAL" },
      { from: "WAITING_APPROVAL", event: "APPROVED", expectedTo: "SCHEDULED" },
      { from: "SCHEDULED", event: "PAYMENT_RUN", expectedTo: "PROCESSING_PAYMENT" },
      { from: "PROCESSING_PAYMENT", event: "PAYMENT_SUCCESS", expectedTo: "PAID" },
      { from: "PAID", event: "ERP_SUCCESS", expectedTo: "ERP_SYNC" },
      { from: "ERP_SYNC", event: "ARCHIVE_COMPLETE", expectedTo: "ARCHIVED" },
    ];

    for (const step of sequence) {
      const rule = findTransition(step.from, step.event);
      expect(rule, `Expected transition rule for ${step.from} + ${step.event}`).toBeDefined();
      expect(rule?.to).toBe(step.expectedTo);
    }
  });

  it("verifies exception branch & rejoin transitions", () => {
    // Validation failure -> Exception branch -> Resolution -> Rejoin to VALIDATED
    const valFailure = findTransition("VALIDATING", "VALIDATION_FAILURE");
    expect(valFailure?.to).toBe("VALIDATION_FAILED");

    const valResolve = findTransition("VALIDATION_FAILED", "EXCEPTION_RESOLVED");
    expect(valResolve?.to).toBe("VALIDATED");

    // Matching failure -> Exception branch -> Resolution -> Rejoin to VALIDATED
    const matchFailure = findTransition("MATCHING", "MATCHING_FAILURE");
    expect(matchFailure?.to).toBe("MATCHING_FAILED");

    const matchResolve = findTransition("MATCHING_FAILED", "EXCEPTION_RESOLVED");
    expect(matchResolve?.to).toBe("VALIDATED");
  });

  it("rejects illegal transitions (Negative Testing)", () => {
    const illegalAttempts: { from: WorkflowState; event: WorkflowEvent }[] = [
      { from: "RECEIVED", event: "PAYMENT_SUCCESS" },
      { from: "RECEIVED", event: "APPROVED" },
      { from: "VALIDATING", event: "ARCHIVE_COMPLETE" },
      { from: "SCHEDULED", event: "CAPTURE_COMPLETE" },
      { from: "ARCHIVED", event: "PAYMENT_RUN" },
    ];

    for (const attempt of illegalAttempts) {
      const rule = findTransition(attempt.from, attempt.event);
      expect(rule, `Illegal transition from ${attempt.from} via ${attempt.event} must be undefined`).toBeUndefined();
    }
  });

  it("verifies read-only status projection mapping for every engine state", () => {
    const stateStatusMap: Record<WorkflowState, string> = {
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

    for (const [state, expectedStatus] of Object.entries(stateStatusMap)) {
      const projection = STATE_TO_INVOICE_STATUS[state as WorkflowState];
      expect(projection, `Engine state ${state} must project to status ${expectedStatus}`).toBe(expectedStatus);
    }
  });
});
