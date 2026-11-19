/**
 * Canonical AI Confidence Score Scale & Classification Law (Doc 05 / AGENTS.md Rule 2 / T-215).
 * 
 * Defines the unified, authoritative 0–100 confidence scale and classification bands
 * shared across the entire system (backend, frontend, and extractor):
 * - HIGH (>= 95%): Pre-fill enabled for one-click human accept (human confirmation still required)
 * - MEDIUM (80–94.99%): Recommendation only, requiring explicit verification
 * - LOW (< 80%): Manual entry only; nothing is pre-filled, triggers LOW_AI_CONFIDENCE exception
 */

export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";

export const CONFIDENCE_THRESHOLDS = {
  HIGH_MIN: 95.0,
  MEDIUM_MIN: 80.0,
} as const;

/**
 * Normalizes an arbitrary confidence value into an authoritative 0–100 scale:
 * - If score is in decimal fraction range (0 < score <= 1.0), it is scaled up by 100 (e.g. 0.95 -> 95).
 * - Truncates out-of-range values to [0, 100].
 */
export function normalizeConfidenceScore(rawScore: number | null | undefined): number {
  if (rawScore == null || isNaN(Number(rawScore))) return 0;
  const num = Number(rawScore);
  if (num <= 0) return 0;
  // If the model/extractor returns a normalized decimal fraction [0.0 - 1.0], scale to percentage [0 - 100]
  if (num > 0 && num <= 1.0) {
    return Math.min(100, Math.round(num * 10000) / 100);
  }
  return Math.min(100, Math.max(0, Math.round(num * 100) / 100));
}

/**
 * Authoritative confidence classification band function.
 * Evaluates scores on the 0–100 percentage scale:
 * - score >= 95.0 -> "HIGH"
 * - score >= 80.0 -> "MEDIUM"
 * - score < 80.0  -> "LOW"
 */
export function classifyConfidence(score: number | null | undefined): ConfidenceBand {
  if (score == null) return "LOW";
  const normalized = normalizeConfidenceScore(score);
  if (normalized >= CONFIDENCE_THRESHOLDS.HIGH_MIN) return "HIGH";
  if (normalized >= CONFIDENCE_THRESHOLDS.MEDIUM_MIN) return "MEDIUM";
  return "LOW";
}
