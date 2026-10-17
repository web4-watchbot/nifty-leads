/**
 * Basic email verification (SPEC Section 13.4, Basic level).
 * Free and Paid: syntax (RFC 5322 subset), MX record (Node dns.resolveMx),
 * disposable domain list, role-address list.
 */

import { resolveMx } from "node:dns";
import { promisify } from "node:util";

const resolveMxAsync = promisify(resolveMx);

// Disposable email domains (subset of disposable-email-domains list;
// the Admin updates weekly per Section 7.4.2).
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com",
  "tempmail.com", "throwawaymail.com", "fakeinbox.com", "trashmail.com",
  "yopmail.com", "dispostable.com", "temp-mail.org", "maildrop.cc",
]);

// Role-address prefixes (Section 5.2 rule: flag info@, sales@).
const ROLE_PREFIXES = new Set([
  "info", "sales", "support", "admin", "contact", "help", "billing",
  "orders", "marketing", "press", "jobs", "careers", "hr", "webmaster",
  "postmaster", "abuse", "no-reply", "noreply",
]);

export type EmailStatus = "valid" | "invalid" | "risky" | "catch_all" | "unknown";
export type EmailType = "person" | "role" | "unknown";

export interface EmailVerifyResult {
  email: string;
  status: EmailStatus;
  type: EmailType;
  reason: string;
}

/**
 * Basic email verification.
 * Returns email_status and email_type.
 */
export async function verifyEmailBasic(input: string): Promise<EmailVerifyResult> {
  const email = input.trim().toLowerCase();

  // Syntax check (RFC 5322 subset).
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { email, status: "invalid", type: "unknown", reason: "invalid syntax" };
  }

  const [local, domain] = email.split("@");

  // Discard image-like names handled upstream; guard anyway.
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(email)) {
    return { email, status: "invalid", type: "unknown", reason: "image filename" };
  }

  // Disposable domain check.
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { email, status: "invalid", type: "unknown", reason: "disposable domain" };
  }

  // Role address check.
  const type: EmailType = ROLE_PREFIXES.has(local) ? "role" : "person";

  // MX record check.
  let mxOk = false;
  try {
    const mx = await resolveMxAsync(domain);
    mxOk = Array.isArray(mx) && mx.length > 0;
  } catch {
    // DNS failure keeps mxOk = false.
  }

  if (!mxOk) {
    return { email, status: "invalid", type, reason: "no mx record" };
  }

  return { email, status: "valid", type, reason: "syntax and mx ok" };
}
