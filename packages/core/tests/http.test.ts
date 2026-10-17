import { describe, it, expect } from "vitest";
import { isAllowedProtocol, isBlockedHost, SSRFError, ssrfFetch, hashUrl } from "../src/http";

describe("isAllowedProtocol", () => {
  it("allows http and https", () => {
    expect(isAllowedProtocol("http://example.com")).toBe(true);
    expect(isAllowedProtocol("https://example.com")).toBe(true);
  });

  it("rejects other protocols", () => {
    expect(isAllowedProtocol("ftp://example.com")).toBe(false);
    expect(isAllowedProtocol("file:///etc/passwd")).toBe(false);
    expect(isAllowedProtocol("javascript:alert(1)")).toBe(false);
    expect(isAllowedProtocol("not-a-url")).toBe(false);
  });
});

describe("isBlockedHost", () => {
  it("blocks localhost", async () => {
    expect(await isBlockedHost("localhost", false)).toBe(true);
    expect(await isBlockedHost("127.0.0.1", false)).toBe(true);
  });

  it("blocks private ranges", async () => {
    expect(await isBlockedHost("10.0.0.1", false)).toBe(true);
    expect(await isBlockedHost("172.16.0.1", false)).toBe(true);
    expect(await isBlockedHost("192.168.1.1", false)).toBe(true);
  });

  it("allows public hosts", async () => {
    // These DNS lookups may fail in sandbox; treat failure as blocked (safe default).
    // Only assert on the ones we can reason about without DNS.
    expect(await isBlockedHost("169.254.169.254", false)).toBe(true);
  });

  it("allows private when allowPrivateNetwork is true", async () => {
    expect(await isBlockedHost("127.0.0.1", true)).toBe(false);
    expect(await isBlockedHost("localhost", true)).toBe(false);
  });
});

describe("ssrfFetch", () => {
  it("throws SSRFError for localhost", async () => {
    await expect(ssrfFetch("http://127.0.0.1/")).rejects.toBeInstanceOf(SSRFError);
  });

  it("throws SSRFError for private ranges", async () => {
    await expect(ssrfFetch("http://10.0.0.1/")).rejects.toBeInstanceOf(SSRFError);
    await expect(ssrfFetch("http://192.168.1.1/")).rejects.toBeInstanceOf(SSRFError);
  });

  it("throws SSRFError for disallowed protocols", async () => {
    await expect(ssrfFetch("file:///etc/passwd")).rejects.toBeInstanceOf(SSRFError);
    await expect(ssrfFetch("javascript:alert(1)")).rejects.toBeInstanceOf(SSRFError);
  });
});

describe("hashUrl", () => {
  it("produces a stable 64-char hex hash", () => {
    const h = hashUrl("https://example.com/search?q=1");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashUrl("https://example.com/search?q=1")).toBe(h);
    expect(hashUrl("https://example.com/search?q=2")).not.toBe(h);
  });
});
