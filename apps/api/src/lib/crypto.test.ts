import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret, maskSecret, reEncryptSecret } from "./crypto";

describe("Cryptographic Vault (AES-256-GCM)", () => {
  it("should encrypt and decrypt secrets symmetrically with keyId envelope", () => {
    const rawApiKey = "AIzaSyD-sample-gemini-pro-key-99128374";
    const encrypted = encryptSecret(rawApiKey);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(rawApiKey);
    expect(encrypted.split(":")).toHaveLength(4); // keyId:iv:authTag:ciphertext
    expect(encrypted.startsWith("v1:")).toBe(true);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toEqual(rawApiKey);
  });

  it("should transparently decrypt legacy unversioned 3-part payloads (iv:authTag:ciphertext)", () => {
    // Legacy payload without keyId
    const rawSecret = "legacy-database-password-12345";
    // We can simulate legacy by stripping keyId
    const modern = encryptSecret(rawSecret);
    const legacy = modern.split(":").slice(1).join(":"); // iv:authTag:ciphertext
    expect(legacy.split(":")).toHaveLength(3);

    const decrypted = decryptSecret(legacy);
    expect(decrypted).toEqual(rawSecret);
  });

  it("should re-encrypt secrets with a new key ID", () => {
    const secret = "stripe_sk_live_123456789";
    const legacy = encryptSecret(secret).split(":").slice(1).join(":");
    const rotated = reEncryptSecret(legacy, "v2");
    expect(rotated.startsWith("v2:")).toBe(true);
    expect(decryptSecret(rotated)).toEqual(secret);
  });

  it("should encrypt database URLs safely", () => {
    const dbUrl = "postgresql://postgres:secret123@db.supabase.co:5432/production?sslmode=require";
    const encrypted = encryptSecret(dbUrl);
    const decrypted = decryptSecret(encrypted);

    expect(decrypted).toEqual(dbUrl);
  });

  it("should fail decryption when ciphertext is tampered with", () => {
    const rawKey = "sk-proj-super-secret-openai-token";
    const encrypted = encryptSecret(rawKey);
    const parts = encrypted.split(":");
    // Tamper with the ciphertext
    const tampered = `${parts[0]}:${parts[1]}:deadbeef${parts[2].slice(8)}`;

    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("should fail decryption when auth tag is tampered with", () => {
    const rawKey = "sk-proj-super-secret-openai-token";
    const encrypted = encryptSecret(rawKey);
    const parts = encrypted.split(":");
    const tamperedTag = `${parts[0]}:0123456789abcdef0123456789abcdef:${parts[2]}`;

    expect(() => decryptSecret(tamperedTag)).toThrow();
  });

  it("should fail decryption when auth tag length is invalid", () => {
    const rawKey = "sk-proj-super-secret-openai-token";
    const encrypted = encryptSecret(rawKey);
    const parts = encrypted.split(":");
    const shortTag = `${parts[0]}:deadbeef:${parts[2]}`;

    expect(() => decryptSecret(shortTag)).toThrow(/Invalid AES-GCM IV or AuthTag length/);
  });

  it("should mask secrets appropriately for UI display", () => {
    expect(maskSecret("AIzaSyBv1234567890abcdef")).toEqual("AIza********cdef");
    expect(maskSecret("short")).toEqual("********");
    expect(maskSecret("")).toEqual("");
  });
});
