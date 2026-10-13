import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret, maskSecret } from "./crypto";

describe("Cryptographic Vault (AES-256-GCM)", () => {
  it("should encrypt and decrypt secrets symmetrically", () => {
    const rawApiKey = "AIzaSyD-sample-gemini-pro-key-99128374";
    const encrypted = encryptSecret(rawApiKey);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(rawApiKey);
    expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toEqual(rawApiKey);
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

  it("should mask secrets appropriately for UI display", () => {
    expect(maskSecret("AIzaSyBv1234567890abcdef")).toEqual("AIza••••••••cdef");
    expect(maskSecret("short")).toEqual("••••••••");
    expect(maskSecret("")).toEqual("");
  });
});
