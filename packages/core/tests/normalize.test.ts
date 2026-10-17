import { describe, it, expect } from "vitest";
import {
  decodeHtmlEntities,
  collapseSpaces,
  normalizeCompanyName,
  normalizeWebsite,
  normalizePhone,
  normalizeEmail,
  normalizeLinkedIn,
  buildLocation,
} from "../src/normalize";

describe("decodeHtmlEntities", () => {
  it("decodes common entities", () => {
    expect(decodeHtmlEntities("AT&amp;T")).toBe("AT&T");
    expect(decodeHtmlEntities("O&#39;Brien")).toBe("O'Brien");
    expect(decodeHtmlEntities("a &lt; b")).toBe("a < b");
  });
});

describe("collapseSpaces", () => {
  it("trims and collapses whitespace", () => {
    expect(collapseSpaces("  hello   world  ")).toBe("hello world");
  });
});

describe("normalizeCompanyName", () => {
  it("keeps display case and computes matchName without suffixes", () => {
    const r = normalizeCompanyName("  ABC Dental Pvt Ltd  ");
    expect(r.display).toBe("ABC Dental Pvt Ltd");
    expect(r.matchName).not.toContain("pvt");
    expect(r.matchName).not.toContain("ltd");
    expect(r.matchName).toBe("abc dental");
  });

  it("decodes entities in name (corp is a legal suffix)", () => {
    const r = normalizeCompanyName("AT&amp;T Corp");
    expect(r.display).toBe("AT&T Corp");
    expect(r.matchName).toBe("at t");
  });
});

describe("normalizeWebsite", () => {
  it("adds https and strips www/path/query", () => {
    const r = normalizeWebsite("www.example.com/contact?utm=1");
    expect(r.website).toBe("https://example.com/");
    expect(r.domain).toBe("example.com");
  });

  it("handles missing protocol", () => {
    const r = normalizeWebsite("example.com");
    expect(r.website).toBe("https://example.com/");
    expect(r.domain).toBe("example.com");
  });
});

describe("normalizePhone", () => {
  it("converts a US number to E.164", () => {
    const r = normalizePhone("(415) 555-0123", "US");
    expect(r.e164).toBe("+14155550123");
  });

  it("returns null for invalid", () => {
    const r = normalizePhone("not-a-phone", "US");
    expect(r.e164).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("lowercases and strips mailto", () => {
    const r = normalizeEmail("MAILTO:John@Example.COM");
    expect(r.email).toBe("john@example.com");
  });

  it("rejects image filenames", () => {
    const r = normalizeEmail("logo@2x.png");
    expect(r.email).toBeNull();
  });

  it("rejects invalid syntax", () => {
    expect(normalizeEmail("not-an-email").email).toBeNull();
  });
});

describe("normalizeLinkedIn", () => {
  it("normalizes a person LinkedIn URL", () => {
    const r = normalizeLinkedIn(
      "https://linkedin.com/in/john-doe?utm=1", "person"
    );
    expect(r.url).toBe("https://www.linkedin.com/in/john-doe/");
  });

  it("normalizes a company LinkedIn URL", () => {
    const r = normalizeLinkedIn(
      "linkedin.com/company/acme-corp", "company"
    );
    expect(r.url).toBe("https://www.linkedin.com/company/acme-corp/");
  });
});

describe("buildLocation", () => {
  it("joins city, state, country", () => {
    expect(buildLocation({ city: "Pune", state: "Maharashtra", country: "India" }))
      .toBe("Pune, Maharashtra, India");
  });

  it("returns empty for no parts", () => {
    expect(buildLocation({})).toBe("");
  });
});
