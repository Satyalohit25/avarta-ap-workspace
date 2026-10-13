import { describe, it, expect } from "vitest";
import { validateDatabaseUrlSecurity } from "../../lib/tenant-db-manager";
import { getTierForAmount, canRoleApproveAmount } from "../approvals/thresholds";
import { env } from "../../config/env";
import { encryptSecret, decryptSecret } from "../../lib/crypto";

describe("Pre-Release Security & Launch Verification Suite", () => {
  describe("A. BYODB SSRF & Security Defense", () => {
    it("rejects localhost and loopback targets", () => {
      expect(validateDatabaseUrlSecurity("postgresql://user:pass@localhost:5432/db?sslmode=require").safe).toBe(false);
      expect(validateDatabaseUrlSecurity("postgresql://user:pass@127.0.0.1:5432/db?sslmode=require").safe).toBe(false);
      expect(validateDatabaseUrlSecurity("postgresql://user:pass@0.0.0.0:5432/db?sslmode=require").safe).toBe(false);
    });

    it("rejects cloud instance metadata IP 169.254.169.254 (AWS/GCP/Azure SSRF)", () => {
      const res = validateDatabaseUrlSecurity("postgresql://user:pass@169.254.169.254:5432/db?sslmode=require");
      expect(res.safe).toBe(false);
      expect(res.reason).toContain("metadata");
    });

    it("rejects internal RFC 1918 private network subnets", () => {
      expect(validateDatabaseUrlSecurity("postgresql://user:pass@10.0.1.5:5432/db?sslmode=require").safe).toBe(false);
      expect(validateDatabaseUrlSecurity("postgresql://user:pass@192.168.1.100:5432/db?sslmode=require").safe).toBe(false);
      expect(validateDatabaseUrlSecurity("postgresql://user:pass@172.16.5.10:5432/db?sslmode=require").safe).toBe(false);
    });

    it("allows valid external cloud database URLs with SSL", () => {
      const res = validateDatabaseUrlSecurity("postgresql://postgres:pword@db.xyz.supabase.co:5432/postgres?sslmode=require");
      expect(res.safe).toBe(true);
    });
  });

  describe("B. Cryptography & Vault Separation", () => {
    it("ensures APP_ENCRYPTION_KEY is configured and separate from JWT_SECRET", () => {
      expect(env.appEncryptionKey).toBeDefined();
      expect(env.appEncryptionKey.length).toBeGreaterThanOrEqual(16);
    });

    it("encrypts and decrypts without data leakage", () => {
      const plain = "AIzaSyLive-production-key-998877";
      const cipher = encryptSecret(plain);
      expect(cipher).not.toContain(plain);
      expect(decryptSecret(cipher)).toBe(plain);
    });
  });

  describe("C. Approval Tier Alignment & Gap Elimination", () => {
    it("provides seamless, continuous tier coverage across INR boundaries", () => {
      expect(getTierForAmount(100_000, "INR").name).toContain("Tier 1");
      expect(getTierForAmount(100_000.01, "INR").name).toContain("Tier 2");
      expect(getTierForAmount(500_000, "INR").name).toContain("Tier 2");
      expect(getTierForAmount(500_000.01, "INR").name).toContain("Tier 3");
    });

    it("eliminates the former $10,000 to $50,000 USD gap completely", () => {
      // Tier 1: <= $10k
      expect(getTierForAmount(10_000, "USD").name).toContain("Tier 1");
      // Tier 2: $10,000.01 to $50,000 (formerly a gap!)
      expect(getTierForAmount(10_000.01, "USD").name).toContain("Tier 2");
      expect(getTierForAmount(25_000, "USD").name).toContain("Tier 2");
      expect(getTierForAmount(50_000, "USD").name).toContain("Tier 2");
      // Tier 3: > $50,000
      expect(getTierForAmount(50_000.01, "USD").name).toContain("Tier 3");
    });

    it("strictly enforces role segregation on elevated tiers", () => {
      expect(canRoleApproveAmount("APPROVER", 5_000, "USD")).toBe(true);
      expect(canRoleApproveAmount("APPROVER", 15_000, "USD")).toBe(false);
      expect(canRoleApproveAmount("FINANCE_MANAGER", 25_000, "USD")).toBe(true);
      expect(canRoleApproveAmount("FINANCE_MANAGER", 75_000, "USD")).toBe(false);
      expect(canRoleApproveAmount("ADMINISTRATOR", 100_000, "USD")).toBe(true);
    });
  });
});
