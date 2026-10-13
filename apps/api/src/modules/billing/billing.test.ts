import { describe, it, expect } from "vitest";
import { SAAS_PLANS } from "./plans";
import { verifyWebhookSignature } from "./webhooks";
import crypto from "crypto";

describe("SaaS Billing, Quotas & Webhook Verification Suite", () => {
  describe("1. Plan Definitions & Quotas", () => {
    it("defines valid quotas for Starter, Growth, and Enterprise plans", () => {
      expect(SAAS_PLANS.STARTER.monthlyInvoiceLimit).toBe(50);
      expect(SAAS_PLANS.STARTER.seatLimit).toBe(2);

      expect(SAAS_PLANS.GROWTH.monthlyInvoiceLimit).toBe(500);
      expect(SAAS_PLANS.GROWTH.seatLimit).toBe(10);

      expect(SAAS_PLANS.ENTERPRISE.monthlyInvoiceLimit).toBe(Infinity);
      expect(SAAS_PLANS.ENTERPRISE.seatLimit).toBe(Infinity);
    });

    it("enforces feature gating per plan tier", () => {
      // Starter does NOT have BYOK, BYODB, or ERP gateway
      expect(SAAS_PLANS.STARTER.features.byokAi).toBe(false);
      expect(SAAS_PLANS.STARTER.features.byodbSovereignty).toBe(false);
      expect(SAAS_PLANS.STARTER.features.erpXmlGateway).toBe(false);

      // Growth includes BYOK, ERP XML gateway, and 3-way matching
      expect(SAAS_PLANS.GROWTH.features.byokAi).toBe(true);
      expect(SAAS_PLANS.GROWTH.features.erpXmlGateway).toBe(true);
      expect(SAAS_PLANS.GROWTH.features.threeWayMatching).toBe(true);
      expect(SAAS_PLANS.GROWTH.features.byodbSovereignty).toBe(false);

      // Enterprise includes BYODB Sovereignty and custom SLA
      expect(SAAS_PLANS.ENTERPRISE.features.byodbSovereignty).toBe(true);
      expect(SAAS_PLANS.ENTERPRISE.features.customSla).toBe(true);
    });
  });

  describe("2. Webhook HMAC Signature Verification", () => {
    const secret = "whsec_live_test_secret_998877";
    const payload = JSON.stringify({
      id: "evt_123456",
      type: "invoice.paid",
      created: 1776000000,
    });

    it("validates authentic webhook signatures correctly", () => {
      const validSig = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      expect(verifyWebhookSignature(payload, validSig, secret)).toBe(true);
    });

    it("rejects tampered webhook payloads", () => {
      const validSig = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const tamperedPayload = JSON.stringify({
        id: "evt_123456",
        type: "invoice.paid",
        created: 9999999999, // tampered
      });

      expect(verifyWebhookSignature(tamperedPayload, validSig, secret)).toBe(false);
    });

    it("rejects forged signatures or incorrect webhook secrets", () => {
      const forgedSig = "deadbeef1234567890abcdef";
      expect(verifyWebhookSignature(payload, forgedSig, secret)).toBe(false);
    });
  });

  describe("3. Quota Boundary Logic", () => {
    it("flags quota exhaustion accurately", () => {
      const starterLimit = SAAS_PLANS.STARTER.monthlyInvoiceLimit;
      const isQuotaExhausted = (used: number, limit: number) => limit !== Infinity && used >= limit;

      expect(isQuotaExhausted(49, starterLimit)).toBe(false);
      expect(isQuotaExhausted(50, starterLimit)).toBe(true);
      expect(isQuotaExhausted(51, starterLimit)).toBe(true);

      // Enterprise unlimited
      const enterpriseLimit = SAAS_PLANS.ENTERPRISE.monthlyInvoiceLimit;
      expect(isQuotaExhausted(99999, enterpriseLimit)).toBe(false);
    });
  });
});
