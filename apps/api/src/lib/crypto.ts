import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for GCM

function getMasterKey(): Buffer {
  // Uses dedicated APP_ENCRYPTION_KEY strictly separate from JWT_SECRET
  const secret = env.appEncryptionKey;
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a sensitive string (API key, connection URL, secret) using AES-256-GCM.
 * Output format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Throws an error if authentication tag verification fails (tampering/bad key).
 */
export function decryptSecret(cipherPayload: string): string {
  if (!cipherPayload) return "";
  const parts = cipherPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format. Expected iv:authTag:ciphertext.");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Masks a secret string for safe display in UI (e.g. "AIzaSy...4x9Q" or "sk-proj-...8AbC").
 */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "••••••••";
  const start = secret.slice(0, 4);
  const end = secret.slice(-4);
  return `${start}••••••••${end}`;
}

/**
 * Generates a 32-byte (256-bit) cryptographically secure random tracking token.
 */
export function generateTrackingToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes SHA-256 hash of a tracking token for secure, timing-safe database lookups.
 */
export function hashTrackingToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Encrypts a tracking token with a key identifier prefix (e.g. "v1:iv:authTag:ciphertext").
 * Allows key rotation without breaking existing encrypted tokens.
 */
export function encryptTrackingToken(plainToken: string, keyId: string = "v1"): string {
  if (!plainToken) return "";
  const encrypted = encryptSecret(plainToken);
  return `${keyId}:${encrypted}`;
}

/**
 * Decrypts an encrypted tracking token payload, supporting both versioned ("v1:iv:authTag:ciphertext")
 * and unversioned payloads.
 */
export function decryptTrackingToken(payload: string): string {
  if (!payload) return "";
  const parts = payload.split(":");
  if (parts.length === 4) {
    const [_keyId, iv, authTag, ciphertext] = parts;
    return decryptSecret(`${iv}:${authTag}:${ciphertext}`);
  }
  return decryptSecret(payload);
}

