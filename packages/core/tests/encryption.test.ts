import { describe, it, expect, beforeEach } from "vitest";
import { encryptSecret, decryptSecret, maskSecret, verifySecret, type EncryptedSecret } from "../src/encryption";

beforeEach(() => {
  // 32 random bytes, base64-encoded (SPEC Section 17.1).
  process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32).toString("base64");
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret", () => {
    const plaintext = "sk-live-1234567890abcdef";
    const encrypted = encryptSecret(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const a = encryptSecret("secret");
    const b = encryptSecret("secret");
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(decryptSecret(a)).toBe("secret");
    expect(decryptSecret(b)).toBe("secret");
  });

  it("supports key rotation via version", () => {
    const encrypted = encryptSecret("secret", 2);
    expect(encrypted.version).toBe(2);
    expect(decryptSecret(encrypted)).toBe("secret");
  });
});

describe("maskSecret", () => {
  it("shows only the last 4 characters", () => {
    expect(maskSecret("sk-live-1234567890")).toBe("****7890");
    expect(maskSecret("abcd")).toBe("****");
    expect(maskSecret("")).toBe("");
  });
});

describe("verifySecret", () => {
  it("returns true for matching plaintext", () => {
    const encrypted = encryptSecret("mypassword");
    expect(verifySecret("mypassword", encrypted)).toBe(true);
  });

  it("returns false for wrong plaintext", () => {
    const encrypted = encryptSecret("mypassword");
    expect(verifySecret("wrong", encrypted)).toBe(false);
  });
});
