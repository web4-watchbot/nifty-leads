/**
 * Field normalization (SPEC Section 13.1).
 * Pure functions: trim, decode, parse, standardize. Never invent values.
 */

import { parsePhoneNumber } from "libphonenumber-js";

// Legal company suffixes removed for match_name (Section 5.2 rule).
const LEGAL_SUFFIXES = [
  "pvt ltd", "private limited", "ltd", "limited", "llc", "gmbh", "inc",
  "corp", "corporation", "co", "company", "sa", "sarl", "spa", "ag",
  "oyj", "ab", "bv", "nv", "kk", "plc",
];

const PUNCT = /[.,&'\/\\\-_()\[\]{}]/g;

/**
 * Decode HTML entities in a string.
 */
export function decodeHtmlEntities(input: string): string {
  let doc: { documentElement: { textContent: string | null } } | null = null;
  if (typeof (globalThis as unknown as { DOMParser?: unknown }).DOMParser !== "undefined") {
    doc = (globalThis as unknown as { DOMParser: (input: string, type: string) => { documentElement: { textContent: string | null } } }).DOMParser(input, "text/html");
  }
  if (doc) {
    return doc.documentElement.textContent ?? input;
  }
  // Node fallback: minimal entity map.
  return input
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ");
}

/**
 * Trim and collapse internal whitespace.
 */
export function collapseSpaces(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/**
 * Normalize a company name: trim, collapse spaces, decode HTML entities,
 * keep original letter case. Returns both the display name and a match_name.
 */
export function normalizeCompanyName(input: string): {
  display: string;
  matchName: string;
} {
  const decoded = decodeHtmlEntities(input);
  const display = collapseSpaces(decoded);
  let match = display.toLowerCase();
  match = match.replace(PUNCT, " ");
  match = collapseSpaces(match);
  for (const suffix of LEGAL_SUFFIXES) {
    const re = new RegExp(`\\b${suffix}\\b`, "g");
    match = match.replace(re, " ");
  }
  match = collapseSpaces(match);
  return { display, matchName: match || display.toLowerCase() };
}

/**
 * Normalize a website URL: add https:// if missing, strip www., paths,
 * query strings and tracking params for company_domain. Return both.
 */
export function normalizeWebsite(input: string): {
  website: string;
  domain: string;
} {
  let url = input.trim();
  if (!url) return { website: "", domain: "" };
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    const website = `${parsed.protocol}//${host}/`;
    const domain = host;
    return { website, domain };
  } catch {
    return { website: url, domain: url };
  }
}

/**
 * Normalize a phone number to E.164 using libphonenumber-js.
 * Returns null if not a valid number for the given country.
 */
export function normalizePhone(input: string, country?: string): {
  e164: string | null;
  type: "mobile" | "fixed_line" | "voip" | "unknown";
} {
  if (!input) return { e164: null, type: "unknown" };
  try {
    const phone = parsePhoneNumber(input, country as Parameters<typeof parsePhoneNumber>[1]);
    if (!phone || !phone.isValid()) return { e164: null, type: "unknown" };
    const e164 = phone.format("E.164");
    let type: "mobile" | "fixed_line" | "voip" | "unknown" = "unknown";
    switch (phone.getType()) {
      case "MOBILE": type = "mobile"; break;
      case "FIXED_LINE": type = "fixed_line"; break;
      case "VOIP": type = "voip"; break;
      default: type = "unknown";
    }
    return { e164, type };
  } catch {
    return { e164: null, type: "unknown" };
  }
}

/**
 * Normalize an email: lowercase, trim, strip mailto:/query strings.
 * Discard image file names that look like emails (logo@2x.png).
 */
export function normalizeEmail(input: string): { email: string | null } {
  if (!input) return { email: null };
  let email = input.trim().toLowerCase();
  email = email.replace(/^mailto:/i, "");
  email = email.replace(/\?.*$/, "");
  // Discard image file names that look like emails (e.g. logo@2x.png).
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(email)) return { email: null };
  // Basic syntax check.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { email: null };
  return { email };
}

/**
 * Normalize a LinkedIn URL (Section 5.2 formats).
 */
export function normalizeLinkedIn(input: string, kind: "person" | "company"): {
  url: string | null;
} {
  if (!input) return { url: null };
  try {
    let u = input.trim().toLowerCase();
    u = u.replace(/\?.*$/, ""); // strip query strings
    u = u.replace(/\/+$/, ""); // trailing slashes
    const expected = kind === "person" ? "in" : "company";
    // Extract slug after linkedin.com/<kind>/
    const re = new RegExp(`linkedin\\.com/${expected}/([^/?#]+)`, "i");
    const m = u.match(re);
    if (!m || !m[1]) return { url: null };
    const slug = m[1];
    return { url: `https://www.linkedin.com/${expected}/${slug}/` };
  } catch {
    return { url: null };
  }
}

/**
 * Build a location display string "City, State, Country" from parts.
 */
export function buildLocation(parts: {
  city?: string; state?: string; country?: string; countryCode?: string;
}): string {
  const city = parts.city?.trim();
  const state = parts.state?.trim();
  const country = parts.country?.trim();
  const bits = [city, state, country].filter(Boolean);
  if (bits.length === 0) return "";
  return bits.join(", ");
}
