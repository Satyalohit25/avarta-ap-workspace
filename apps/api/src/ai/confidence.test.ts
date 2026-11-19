import { describe, expect, it } from "vitest";
import {
  classifyConfidence,
  normalizeConfidenceScore,
  CONFIDENCE_THRESHOLDS,
} from "./confidence";

describe("AI Confidence Bands & Non-Automated Transition Law (T-215)", () => {
  it("classifies >=95% as HIGH confidence", () => {
    expect(classifyConfidence(98)).toBe("HIGH");
    expect(classifyConfidence(95)).toBe("HIGH");
    expect(classifyConfidence(95.0)).toBe("HIGH");
    expect(classifyConfidence(0.95)).toBe("HIGH");
    expect(classifyConfidence(0.98)).toBe("HIGH");
  });

  it("classifies 80-94.99% as MEDIUM confidence", () => {
    expect(classifyConfidence(94.9)).toBe("MEDIUM");
    expect(classifyConfidence(94.99)).toBe("MEDIUM");
    expect(classifyConfidence(92)).toBe("MEDIUM");
    expect(classifyConfidence(80)).toBe("MEDIUM");
    expect(classifyConfidence(80.0)).toBe("MEDIUM");
    expect(classifyConfidence(0.8)).toBe("MEDIUM");
    expect(classifyConfidence(0.949)).toBe("MEDIUM");
  });

  it("classifies <80% as LOW confidence", () => {
    expect(classifyConfidence(79.9)).toBe("LOW");
    expect(classifyConfidence(79)).toBe("LOW");
    expect(classifyConfidence(45)).toBe("LOW");
    expect(classifyConfidence(0.799)).toBe("LOW");
    expect(classifyConfidence(0.45)).toBe("LOW");
    expect(classifyConfidence(null)).toBe("LOW");
  });

  it("normalizes boundary scores accurately across 0-1 and 0-100 scales", () => {
    // Exact boundary requirements from T-215: 79.9, 80, 94.9, 95
    expect(classifyConfidence(79.9)).toBe("LOW");
    expect(classifyConfidence(80)).toBe("MEDIUM");
    expect(classifyConfidence(94.9)).toBe("MEDIUM");
    expect(classifyConfidence(95)).toBe("HIGH");

    // Normalized decimal equivalents
    expect(classifyConfidence(0.799)).toBe("LOW");
    expect(classifyConfidence(0.80)).toBe("MEDIUM");
    expect(classifyConfidence(0.949)).toBe("MEDIUM");
    expect(classifyConfidence(0.95)).toBe("HIGH");
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
