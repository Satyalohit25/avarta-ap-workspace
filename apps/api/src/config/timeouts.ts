export const OUTBOUND_TIMEOUTS = {
  /** 5s timeout for health checks, BYOK validation, and payment ping tests */
  KEY_TEST_MS: 5_000,
  /** 10s timeout for transactional sync, ERP export, and payout dispatches */
  TRANSACTIONAL_SYNC_MS: 10_000,
  /** 30s timeout for heavy multimodal AI document extraction and OCR */
  AI_EXTRACTION_MS: 30_000,
} as const;
