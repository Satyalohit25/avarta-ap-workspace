import { describe, expect, it } from "vitest";
import { findTransition, availableEvents } from "./transitions";

describe("Workflow Transitions Engine State Machine", () => {
  it("allows happy path transition from RECEIVED to CAPTURED", () => {
    const rule = findTransition("RECEIVED", "CAPTURE_COMPLETE");
    expect(rule).toBeDefined();
    expect(rule?.to).toBe("CAPTURED");
  });

  it("allows transition from CAPTURED to VALIDATING", () => {
    const rule = findTransition("CAPTURED", "VALIDATION_START");
    expect(rule).toBeDefined();
    expect(rule?.to).toBe("VALIDATING");
  });

  it("handles exception resolution via EXCEPTION_RESOLVED event", () => {
    const rule = findTransition("VALIDATION_FAILED", "EXCEPTION_RESOLVED");
    expect(rule).toBeDefined();
    expect(rule?.to).toBe("VALIDATED");
  });

  it("handles payment workflow from SCHEDULED to PAID", () => {
    const runRule = findTransition("SCHEDULED", "PAYMENT_RUN");
    expect(runRule?.to).toBe("PROCESSING_PAYMENT");

    const successRule = findTransition("PROCESSING_PAYMENT", "PAYMENT_SUCCESS");
    expect(successRule?.to).toBe("PAID");
  });

  it("returns available events for a state", () => {
    const events = availableEvents("WAITING_APPROVAL");
    expect(events).toContain("APPROVED");
    expect(events).toContain("REJECTED");

    const matchedEvents = availableEvents("MATCHED");
    expect(matchedEvents).toContain("APPROVAL_REQUEST");
    expect(matchedEvents).toContain("MATCHING_START");
  });

  it("handles archive transitions from ERP_SYNC and PAID", () => {
    const fromErp = findTransition("ERP_SYNC", "ARCHIVE_COMPLETE");
    expect(fromErp?.to).toBe("ARCHIVED");

    const fromPaid = findTransition("PAID", "ARCHIVE_COMPLETE");
    expect(fromPaid?.to).toBe("ARCHIVED");
  });

  it("returns undefined for illegal state transitions", () => {
    const rule = findTransition("RECEIVED", "PAYMENT_SUCCESS");
    expect(rule).toBeUndefined();
  });
});
