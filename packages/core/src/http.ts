/**
 * SSRF-protected HTTP client (SPEC Section 17.2).
 *
 * Protects the server when Admins and Users enter URLs (Source base URLs,
 * websites, webhooks).
 *
 * Rules:
 * 1. Resolve the DNS name before connecting. Block private and reserved ranges.
 * 2. Check again after each redirect.
 * 3. Permit only http and https.
 * 4. Exception: an LLM Provider or Source with "Allow private network" on
 *    (self-hosted installs only).
 */

import { createHash } from "node:crypto";
import { lookup } from "node:dns";
import { promisify } from "node:util";

const dnsLookup = promisify(lookup);

// Private / reserved IP ranges that must be blocked (SPEC Section 17.2.1).
const BLOCKED_RANGES: Array<{ start: number; end: number; label: string }> = [
  { start: 0x7f000000, end: 0x7fffffff, label: "127.0.0.0/8" },
  { start: 0x0a000000, end: 0x0affffff, label: "10.0.0.0/8" },
  { start: 0xac100000, end: 0xac1fffff, label: "172.16.0.0/12" },
  { start: 0xc0a80000, end: 0xc0a8ffff, label: "192.168.0.0/16" },
  { start: 0xa9fe0000, end: 0xa9feffff, label: "169.254.0.0/16" },
  { start: 0x00000000, end: 0x00ffffff, label: "0.0.0.0/8" },
];

export interface SSRFHttpOptions {
  /** Allow private network ranges (self-hosted installs only). Default false. */
  allowPrivateNetwork?: boolean;
  /** Max redirects to follow. Default 5. */
  maxRedirects?: number;
  /** Request timeout in ms. Default 30000. */
  timeoutMs?: number;
  /** Additional headers to send. */
  headers?: Record<string, string>;
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) throw new Error(`Invalid IPv4 address: ${ip}`);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isBlockedIPv4(ip: string): boolean {
  const int = ipv4ToInt(ip);
  return BLOCKED_RANGES.some((r) => int >= r.start && int <= r.end);
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // ::1
  if (lower === "::1") return true;
  // fc00::/7
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // fe80::/10
  if (
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  )
    return true;
  return false;
}

export async function isBlockedHost(hostname: string, allowPrivateNetwork: boolean): Promise<boolean> {
  if (allowPrivateNetwork) return false;
  try {
    const addresses = await dnsLookup(hostname, { all: true });
    const list = Array.isArray(addresses) ? addresses : [addresses];
    for (const addr of list) {
      const ip = addr.address;
      if (ip.includes(":")) {
        if (isBlockedIPv6(ip)) return true;
      } else {
        if (isBlockedIPv4(ip)) return true;
      }
    }
    return false;
  } catch {
    // If DNS resolution fails, treat as blocked to be safe.
    return true;
  }
}

export function isAllowedProtocol(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export class SSRFError extends Error {
  public readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "SSRFError";
  }
}

const APP_USER_AGENT = "NiftyLeadsBot/1.0 (+https://leads.niftytechfinds.com/bot)";

/**
 * Fetch with SSRF protection. Validates the initial URL and blocks redirects
 * to private/reserved ranges (checked after each hop).
 */
export async function ssrfFetch(
  input: string,
  init: RequestInit & SSRFHttpOptions = {},
): Promise<Response> {
  const allowPrivateNetwork = init.allowPrivateNetwork ?? false;
  const maxRedirects = init.maxRedirects ?? 5;
  const timeoutMs = init.timeoutMs ?? 30000;

  if (!isAllowedProtocol(input)) {
    throw new SSRFError(`Only http and https URLs are allowed: ${input}`);
  }

  let currentUrl = input;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const parsed = new URL(currentUrl);
    if (await isBlockedHost(parsed.hostname, allowPrivateNetwork)) {
      throw new SSRFError(`Private or reserved network blocked: ${parsed.hostname}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(currentUrl, {
        method: init.method ?? "GET",
        headers: {
          "User-Agent": APP_USER_AGENT,
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
        redirect: "manual",
      } as RequestInit);

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        res.body?.cancel();
        clearTimeout(timeout);
        controller.abort();
        if (!location) {
          return res;
        }
        currentUrl = new URL(location, currentUrl).href;
        if (hop === maxRedirects) {
          throw new SSRFError(`Too many redirects (max ${maxRedirects})`);
        }
        continue;
      }
      clearTimeout(timeout);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof SSRFError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new SSRFError(`Request timed out after ${timeoutMs}ms: ${currentUrl}`);
      }
      throw err;
    }
  }
  throw new SSRFError(`Too many redirects (max ${maxRedirects})`);
}

/**
 * Hash a URL for cache keys (SPEC Section 9.5.6: cache key = Source kind +
 * normalized query). Stable, no secrets in output.
 */
export function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}
