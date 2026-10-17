/**
 * Encryption helper (SPEC Section 17.1).
 *
 * Encrypts all API keys and passwords at rest with AES-256-GCM.
 * Uses APP_ENCRYPTION_KEY from the environment (32 bytes, base64).
 * Stores IV, auth tag, ciphertext and key version. Supports key rotation.
 * Never returns the plaintext secret to callers except via decrypt().
 */

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

export const CURRENT_KEY_VERSION = 1;

export interface EncryptedSecret {
  version: number;
  iv: string;        // base64
  tag: string;       // base64 (auth tag)
  ciphertext: string; // base64
}

export function getEncryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY is not set");
  }
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new Error("APP_ENCRYPTION_KEY must be valid base64");
  }
  if (key.length !== 32) {
    throw new Error(`APP_ENCRYPTION_KEY must be 32 bytes, got ${key.length}`);
  }
  return key;
}

export function encryptSecret(plaintext: string, keyVersion = CURRENT_KEY_VERSION): EncryptedSecret {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(String(keyVersion), "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    version: keyVersion,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptSecret(encrypted: EncryptedSecret): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, "base64");
  const tag = Buffer.from(encrypted.tag, "base64");
  const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  decipher.setAAD(Buffer.from(String(encrypted.version), "utf8"));
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/**
 * Mask a secret for display: show only the last 4 characters.
 */
export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return "****".concat(value.slice(-4));
}

/**
 * Constant-time comparison for verifying a plaintext against an encrypted value.
 * Returns true if they match.
 */
export function verifySecret(plaintext: string, encrypted: EncryptedSecret): boolean {
  try {
    return timingSafeEqual(
      Buffer.from(plaintext, "utf8"),
      Buffer.from(decryptSecret(encrypted), "utf8"),
    );
  } catch {
    return false;
  }
}
