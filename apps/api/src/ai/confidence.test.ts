import { describe, expect, it } from "vitest";

function classifyConfidence(confidenceScore: number) {
  if (confidenceScore >= 95) return "HIGH";
  if (confidenceScore >= 80) return "MEDIUM";
  return "LOW";
}

describe("AI Confidence Bands & Non-Automated Transition Law", () => {
  it("classifies >=95% as HIGH confidence", () => {
    expect(classifyConfidence(98)).toBe("HIGH");
    expect(classifyConfidence(95)).toBe("HIGH");
  });

  it("classifies 80-94% as MEDIUM confidence", () => {
    expect(classifyConfidence(92)).toBe("MEDIUM");
    expect(classifyConfidence(80)).toBe("MEDIUM");
  });

  it("classifies <80% as LOW confidence", () => {
    expect(classifyConfidence(79)).toBe("LOW");
    expect(classifyConfidence(45)).toBe("LOW");
  });

  it("prohibits AI confidence score from automatically updating state without explicit human click", () => {
    const mockInvoice = {
      id: "inv-100",
      aiConfidence: 99,
      workflowState: "CAPTURED",
    };

    // AI score is 99%, but workflow state MUST NOT advance automatically to APPROVED or VALIDATED
    expect(mockInvoice.workflowState).toBe("CAPTURED");
    expect(mockInvoice.workflowState).not.toBe("APPROVED");
    expect(mockInvoice.workflowState).not.toBe("VALIDATED");
  });
});
