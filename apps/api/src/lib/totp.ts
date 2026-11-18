import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encodes a buffer into a standard Base32 string (RFC 4648).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string into a Buffer.
 */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${clean[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a cryptographically secure Base32 TOTP secret (20 bytes / 32 chars).
 */
export function generateTotpSecret(numBytes = 20): string {
  const randomBytes = crypto.randomBytes(numBytes);
  return base32Encode(randomBytes);
}

/**
 * Generates a 6-digit TOTP code for a given timestamp and secret (RFC 6238).
 */
export function generateTotpCode(
  secretBase32: string,
  timeOffsetSeconds = 0,
  timeStepSeconds = 30
): string {
  const key = base32Decode(secretBase32);
  const nowSeconds = Math.floor(Date.now() / 1000) + timeOffsetSeconds;
  const counter = Math.floor(nowSeconds / timeStepSeconds);

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key);
  hmac.update(counterBuf);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % 1_000_000;
  return otp.toString().padStart(6, "0");
}

/**
 * Verifies a 6-digit TOTP code against a secret within a window (default +/- 1 step).
 */
export function verifyTotpCode(
  secretBase32: string,
  code: string,
  windowSteps = 1,
  timeStepSeconds = 30
): boolean {
  if (!code || !/^\d{6}$/.test(code.trim())) {
    return false;
  }
  const cleanCode = code.trim();

  for (let step = -windowSteps; step <= windowSteps; step++) {
    const validCode = generateTotpCode(secretBase32, step * timeStepSeconds, timeStepSeconds);
    if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(validCode))) {
      return true;
    }
  }

  return false;
}

/**
 * Generates an otpauth:// URI suitable for authenticator apps / QR codes.
 */
export function generateOtpAuthUri(
  email: string,
  issuer: string,
  secretBase32: string
): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(email)}`;
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export interface HashedRecoveryCode {
  hash: string;
  used: boolean;
  usedAt?: string;
}

/**
 * Generates 8 single-use recovery codes in XXXX-XXXX-XXXX format and their SHA-256 hashes.
 */
export function generateRecoveryCodes(count = 8): {
  plainCodes: string[];
  hashedCodes: HashedRecoveryCode[];
} {
  const plainCodes: string[] = [];
  const hashedCodes: HashedRecoveryCode[] = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(6).toString("hex").toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    const hash = crypto.createHash("sha256").update(formatted).digest("hex");

    plainCodes.push(formatted);
    hashedCodes.push({ hash, used: false });
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verifies and consumes a recovery code. Returns valid: true and updated serialized codes if matched.
 */
export function verifyAndConsumeRecoveryCode(
  serializedCodesJson: string | null | undefined,
  inputCode: string
): { valid: boolean; updatedCodesJson?: string } {
  if (!serializedCodesJson || !inputCode) {
    return { valid: false };
  }

  try {
    const codes: HashedRecoveryCode[] = JSON.parse(serializedCodesJson);
    if (!Array.isArray(codes)) return { valid: false };

    const normalized = inputCode.trim().toUpperCase();
    const inputHash = crypto.createHash("sha256").update(normalized).digest("hex");

    const matchIndex = codes.findIndex((c) => !c.used && c.hash === inputHash);
    if (matchIndex === -1) {
      return { valid: false };
    }

    codes[matchIndex].used = true;
    codes[matchIndex].usedAt = new Date().toISOString();

    return {
      valid: true,
      updatedCodesJson: JSON.stringify(codes),
    };
  } catch {
    return { valid: false };
  }
}
