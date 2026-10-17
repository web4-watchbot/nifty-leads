/**
 * Website Enricher connector (SPEC Sections 9.2 and 11).
 * Rule-based extraction on the Free Plan; AI extraction on Paid (Phase 1B).
 * Crawls up to 6 pages per domain: /, /contact, /contact-us, /about, /about-us, /team.
 */

import { ssrfFetch } from "@nifty-leads/core";
import { load, type CheerioAPI } from "cheerio";
import type {
  SourceConnector,
  LeadField,
  RawLead,
  SourceConfig,
  RunContext,
  SearchQuery,
} from "../connector";

const PRIORITY_PAGES = [
  "/",
  "/contact",
  "/contact-us",
  "/about",
  "/about-us",
  "/team",
  "/our-team",
  "/leadership",
  "/impressum",
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function isSocialOrDirectory(url: string): boolean {
  const host = new URL(url).hostname.toLowerCase();
  return /(facebook|instagram|linkedin|twitter|x\.com|youtube|wa\.me|linktr\.ee|justdial|indiamart|yelp|google\.com\/maps)/.test(host);
}

function absoluteUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function extractEmails($: CheerioAPI): string[] {
  const found = new Set<string>();
  $("a[href^='mailto:']").each((_i, el) => {
    const href = $(el).attr("href") ?? "";
    const email = href.replace(/^mailto:/i, "").split("?")[0];
    if (email) found.add(email.toLowerCase());
  });
  $("body").each((_i, el) => {
    const text = $(el).text();
    let m: RegExpExecArray | null;
    while ((m = EMAIL_REGEX.exec(text))) found.add(m[0].toLowerCase());
  });
  return Array.from(found);
}

function extractPhones($: CheerioAPI): string[] {
  const found = new Set<string>();
  $("a[href^='tel:']").each((_i, el) => {
    const href = $(el).attr("href") ?? "";
    const num = href.replace(/^tel:/i, "");
    if (num) found.add(num);
  });
  $("body").each((_i, el) => {
    const text = $(el).text();
    const segments = text.split(/\s+/);
    for (const seg of segments) {
      const cleaned = seg.replace(/[^\d+]/g, "");
      if (cleaned.length >= 7 && /^\+?\d/.test(cleaned)) found.add(cleaned);
    }
  });
  return Array.from(found);
}

function extractJsonLd($: CheerioAPI): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "{}");
      const arr = Array.isArray(data) ? data : [data];
      for (const item of arr) {
        const type = Array.isArray(item["@type"]) ? item["@type"][0] : item["@type"];
        if (type === "Organization" || type === "LocalBusiness" || type === "Person") {
          out.name = item.name ?? out.name;
          out.email = item.email ?? out.email;
          out.telephone = item.telephone ?? out.telephone;
          out.address = item.address ?? out.address;
          if (item.sameAs) out.social_links = item.sameAs;
          if (item.jobTitle) out.job_title = item.jobTitle;
        }
      }
    } catch {
      // Ignore malformed JSON-LD.
    }
  });
  return out;
}

function extractSocialLinks($: CheerioAPI): Record<string, string> {
  const social: Record<string, string> = {};
  $("a[href]").each((_i, el) => {
    const href = $(el).attr("href") ?? "";
    try {
      const url = new URL(href).href;
      const host = new URL(url).hostname.toLowerCase();
      if (host.includes("linkedin.com/in/")) {
        social.person_linkedin_url = url;
      } else if (host.includes("linkedin.com/company/")) {
        social.company_linkedin_url = url;
      } else if (host.includes("facebook.com")) social.facebook_url = url;
      else if (host.includes("instagram.com")) social.instagram_url = url;
      else if (host.includes("twitter.com") || host.includes("x.com")) social.x_url = url;
      else if (host.includes("youtube.com")) social.youtube_url = url;
      else if (host.includes("wa.me")) social.whatsapp_number = url;
    } catch {
      // Ignore invalid URLs.
    }
  });
  return social;
}

export const WebsiteEnricherConnector: SourceConnector = {
  kind: "website_enricher",
  label: "Website Enricher",
  canFill: [
    "email",
    "phone",
    "individual_name",
    "role",
    "person_linkedin_url",
    "company_linkedin_url",
  ],
  supportsModes: ["enrich", "company_b2b"],
  async estimate(_q: SearchQuery, cfg: SourceConfig) {
    return { calls: 1, credits: cfg.costCreditsPerCall };
  },
  async *search(q: SearchQuery, cfg: SourceConfig, ctx: RunContext): AsyncGenerator<RawLead> {
    const seedLeads = q.seedLeads ?? [];
    for (const seed of seedLeads) {
      if (ctx.aborted) return;
      const website = seed.fields.company_website;
      if (!website) continue;

      const domain = new URL(website).hostname;
      const visited = new Set<string>();
      const queue: string[] = [website];

      let pagesCrawled = 0;
      while (queue.length > 0 && pagesCrawled < 6 && !ctx.aborted) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        pagesCrawled++;

        let html: string;
        try {
          const res = await ssrfFetch(current, {
            timeoutMs: 10000,
            allowPrivateNetwork: cfg.allowPrivateNetwork,
          });
          if (!res.ok) continue;
          const ct = res.headers.get("content-type") ?? "";
          if (!ct.includes("text/html")) continue;
          html = await res.text();
          if (html.length > 2 * 1024 * 1024) continue; // max 2 MB
        } catch {
          continue;
        }

        const $ = load(html);

        // Collect fields from this page.
        const fields: Partial<Record<LeadField, string>> = {};
        const emails = extractEmails($);
        const phones = extractPhones($);
        const jsonLd = extractJsonLd($);
        const social = extractSocialLinks($);

        if (emails.length && q.wantedFields.includes("email")) fields.email = emails[0];
        if (phones.length && q.wantedFields.includes("phone")) fields.phone = phones[0];
        if (q.wantedFields.includes("company_website") && !fields.company_website) fields.company_website = website;
        if (q.wantedFields.includes("company_name") && jsonLd.name) fields.company_name = String(jsonLd.name);
        if (q.wantedFields.includes("individual_name") && jsonLd.name && jsonLd["@type"] === "Person") {
          fields.individual_name = String(jsonLd.name);
        }
        if (q.wantedFields.includes("role") && jsonLd.job_title) fields.role = String(jsonLd.job_title);
        if (social.person_linkedin_url && q.wantedFields.includes("person_linkedin_url")) {
          fields.person_linkedin_url = social.person_linkedin_url;
        }
        if (social.company_linkedin_url && q.wantedFields.includes("company_linkedin_url")) {
          fields.company_linkedin_url = social.company_linkedin_url;
        }

        const extended: Record<string, unknown> = {
          company_domain: domain,
          ...social,
          ...jsonLd,
          description: $("meta[name='description']").attr("content") || undefined,
          logo_url: $("meta[property='og:image']").attr("content") || undefined,
          facebook_url: social.facebook_url,
          instagram_url: social.instagram_url,
          x_url: social.x_url,
          youtube_url: social.youtube_url,
          whatsapp_number: social.whatsapp_number,
        };

        if (Object.keys(fields).length > 0 || Object.keys(extended).length > 0) {
          yield {
            fields,
            extended,
            sourceKind: "website_enricher",
            sourceRecordId: domain,
            sourceUrl: current,
            fetchedAt: new Date().toISOString(),
          };
        }

        // Enqueue priority pages.
        if (pagesCrawled < 6) {
          for (const page of PRIORITY_PAGES) {
            const abs = absoluteUrl(website, page);
            if (abs && !visited.has(abs) && !isSocialOrDirectory(abs)) {
              queue.push(abs);
            }
          }
          // Also follow links whose text contains contact/about/team.
          $("a[href]").each((_, el) => {
            const text = $(el).text().toLowerCase();
            const href = $(el).attr("href") ?? "";
            if (/(contact|about|team)/.test(text)) {
              const abs = absoluteUrl(website, href);
              if (abs && !isSocialOrDirectory(abs)) queue.push(abs);
            }
          });
        }
      }
    }
  },
  async test(_cfg: SourceConfig) {
    // Website enricher doesn't have a single endpoint to test;
    // validation happens when enriching an actual website.
    return { ok: true, sample: [], error: undefined };
  },
};
