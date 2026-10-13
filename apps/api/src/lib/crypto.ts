import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for GCM

function getMasterKey(): Buffer {
  // Uses dedicated APP_ENCRYPTION_KEY strictly separate from JWT_SECRET
  const secret = env.appEncryptionKey;
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
