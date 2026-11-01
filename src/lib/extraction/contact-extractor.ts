// Extract emails, phones, and social profile URLs from raw HTML / text.

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}\b/gi;
// Match international phone numbers (+cc) plus US-style formats
const PHONE_RE = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)|\d{1,4})[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{1,4})?/g;

const BAD_EMAIL_DOMAINS = ["sentry.io", "wixpress.com", "example.com", "domain.com", "yourdomain.com", "email.com", "yourcompany.com"];
const BAD_EMAIL_LOCAL = ["noreply", "no-reply", "donotreply", "do-not-reply", "example", "test", "sample"];

export function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_RE) || [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const lower = m.toLowerCase();
    const [local, domain] = lower.split("@");
    if (!local || !domain) continue;
    if (BAD_EMAIL_DOMAINS.includes(domain)) continue;
    if (BAD_EMAIL_LOCAL.some((b) => local.includes(b))) continue;
    if (local.length > 64 || domain.length > 255) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(m);
    if (out.length >= 10) break;
  }
  return out;
}

export function extractPhones(text: string): string[] {
  const matches = text.match(PHONE_RE) || [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const digits = m.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) continue;
    // Filter out years (4-digit) and dates
    if (/^\d{4}$/.test(m.trim())) continue;
    if (seen.has(digits)) continue;
    seen.add(digits);
    out.push(m.trim());
    if (out.length >= 5) break;
  }
  return out;
}

export function extractSocialLinks(html: string, baseUrl: string): {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  github?: string;
} {
  const result: Record<string, string | undefined> = {};
  const patterns: Record<string, RegExp> = {
    linkedin: /https?:\/\/(?:[a-z]+\.)?linkedin\.com\/(?:company|in|school)\/[A-Za-z0-9_\-./%]+/i,
    twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]{1,15}/i,
    facebook: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.\-/]+/i,
    instagram: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.\-/]+/i,
    youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:channel|c|user)\/[A-Za-z0-9_\-./%]+/i,
    tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.\-]+/i,
    github: /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_\-]+/i,
  };
  for (const [key, re] of Object.entries(patterns)) {
    const m = html.match(re);
    if (m) {
      try {
        result[key] = new URL(m[0]).toString().split(/[?#]/)[0];
      } catch {
        result[key] = m[0];
      }
    }
  }
  // Suppress unused param lint
  void baseUrl;
  return result as { linkedin?: string; twitter?: string; facebook?: string; instagram?: string; youtube?: string; tiktok?: string; github?: string };
}

export function classifyEmail(email: string, pageHost: string): "verified" | "publicly_listed" | "inferred" | "invalid" {
  const lower = email.toLowerCase();
  const domain = lower.split("@")[1];
  // Same domain as page → strongly suggest it's a published business email
  if (pageHost && domain === pageHost.replace(/^www\./, "")) {
    return "publicly_listed";
  }
  // Free webmail → mark inferred (we cannot verify the person behind it)
  if (["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "proton.me", "icloud.com"].includes(domain)) {
    return "inferred";
  }
  // Otherwise, publicly listed but unverified
  return "publicly_listed";
}
