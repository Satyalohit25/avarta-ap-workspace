import { describe, it, expect } from "vitest";
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  generateOtpAuthUri,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
} from "./totp";

describe("TOTP & Recovery Code Engine (RFC 6238)", () => {
  it("encodes and decodes base32 correctly", () => {
    const original = Buffer.from("Hello World!", "utf8");
    const encoded = base32Encode(original);
    const decoded = base32Decode(encoded);
    expect(decoded.toString("utf8")).toBe("Hello World!");
  });

  it("generates a valid 32-character base32 secret", () => {
    const secret = generateTotpSecret(20);
    expect(secret).toHaveLength(32);
    expect(/^[A-Z2-7]{32}$/.test(secret)).toBe(true);
  });

  it("generates and verifies valid TOTP codes within time window", () => {
    const secret = generateTotpSecret(20);
    const currentCode = generateTotpCode(secret);
    expect(currentCode).toHaveLength(6);
    expect(/^\d{6}$/.test(currentCode)).toBe(true);

    // Current code passes
    expect(verifyTotpCode(secret, currentCode)).toBe(true);

    // Invalid code fails
    expect(verifyTotpCode(secret, "000000" === currentCode ? "111111" : "000000")).toBe(false);
  });

  it("accepts codes within 1 step drift window", () => {
    const secret = generateTotpSecret(20);
    const pastCode = generateTotpCode(secret, -30);
    const futureCode = generateTotpCode(secret, 30);
    const farPastCode = generateTotpCode(secret, -90);

    expect(verifyTotpCode(secret, pastCode, 1)).toBe(true);
    expect(verifyTotpCode(secret, futureCode, 1)).toBe(true);
    expect(verifyTotpCode(secret, farPastCode, 1)).toBe(false);
  });

  it("generates correct otpauth URI", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const uri = generateOtpAuthUri("user@example.com", "Avarta AP", secret);
    expect(uri).toBe(
      "otpauth://totp/Avarta%20AP:user%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Avarta%20AP&algorithm=SHA1&digits=6&period=30"
    );
  });

  it("handles single-use recovery codes correctly", () => {
    const { plainCodes, hashedCodes } = generateRecoveryCodes(8);
    expect(plainCodes).toHaveLength(8);
    expect(hashedCodes).toHaveLength(8);

    const serialized = JSON.stringify(hashedCodes);
    const firstCode = plainCodes[0];

    // First use passes
    const result1 = verifyAndConsumeRecoveryCode(serialized, firstCode);
    expect(result1.valid).toBe(true);
    expect(result1.updatedCodesJson).toBeDefined();

    // Replay of same code fails
    const result2 = verifyAndConsumeRecoveryCode(result1.updatedCodesJson!, firstCode);
    expect(result2.valid).toBe(false);

    // Second code still passes
    const secondCode = plainCodes[1];
    const result3 = verifyAndConsumeRecoveryCode(result1.updatedCodesJson!, secondCode);
    expect(result3.valid).toBe(true);
  });
});
