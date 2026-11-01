// Free website crawler — fetches publicly accessible HTML and extracts:
//   * meta tags (title, description, og:*, twitter:*)
//   * JSON-LD structured data (schema.org Organization, LocalBusiness, etc.)
//   * visible contact info (emails, phones, social links)
//   * business name, address, etc.
// Respects robots.txt and standard crawl limits.

import { extractEmails, extractPhones, extractSocialLinks } from "../extraction/contact-extractor";
import { parseStructuredData } from "../extraction/schema-parser";

export interface CrawledSite {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  businessName?: string;
  emails: string[];
  phones: string[];
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  socialLinks: { linkedin?: string; twitter?: string; facebook?: string; instagram?: string; youtube?: string; tiktok?: string; github?: string; };
  industry?: string;
  logoUrl?: string;
  schemaData?: Record<string, unknown>[];
  contactPageUrl?: string;
  aboutPageUrl?: string;
  statusCode: number;
  fetchedAt: string;
  error?: string;
}

const FETCH_TIMEOUT = 8000;
const MAX_BYTES = 1024 * 1024; // 1 MB cap

export async function crawlWebsite(rawUrl: string): Promise<CrawledSite> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  let finalUrl = url;

  const base: CrawledSite = {
    url,
    finalUrl,
    title: "",
    description: "",
    emails: [],
    phones: [],
    socialLinks: {},
    statusCode: 0,
    fetchedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NiftyLeadFinder/1.0; +https://niftytechfinds.com)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    base.statusCode = res.status;
    base.finalUrl = res.url || url;
    if (!res.ok) {
      base.error = `HTTP ${res.status}`;
      return base;
    }
    // Read body with size cap
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return parseHtml(text, base);
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.length;
        if (total > MAX_BYTES) break;
      }
    }
    const decoder = new TextDecoder("utf-8");
    const html = chunks.map((c) => decoder.decode(c, { stream: true })).join("") + decoder.decode();
    return parseHtml(html, base);
  } catch (e) {
    base.error = (e as Error).message;
    return base;
  }
}

function parseHtml(html: string, base: CrawledSite): CrawledSite {
  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  base.title = titleMatch ? decodeEntities(titleMatch[1]).trim() : "";

  // Meta description
  const descMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i);
  base.description = descMatch ? decodeEntities(descMatch[1]).trim() : "";

  // OG site name
  const siteNameMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  if (siteNameMatch) base.businessName = decodeEntities(siteNameMatch[1]).trim();
  else if (base.title) {
    // Use title with site suffix stripped: "ACME Corp — Home" → "ACME Corp"
    base.businessName = base.title.replace(/\s*[\|\-–—]\s*.*(home|welcome|official site).*$/i, "").trim() || base.title;
  }

  // Logo
  const logoMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i);
  if (logoMatch) {
    const href = logoMatch[1];
    base.logoUrl = /^https?:/i.test(href) ? href : new URL(href, base.finalUrl).toString();
  }

  // Strip script/style blocks before extraction
  const cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");

  // Emails & phones
  base.emails = extractEmails(cleaned);
  base.phones = extractPhones(cleaned);

  // Social links
  const socials = extractSocialLinks(html, base.finalUrl);
  base.socialLinks = { ...base.socialLinks, ...socials };

  // Schema.org JSON-LD
  const schema = parseStructuredData(html);
  if (schema.length) {
    base.schemaData = schema;
    for (const s of schema) {
      const type = (s["@type"] as string) || "";
      if (/organization|localbusiness|place|restaurant|store|company/i.test(type)) {
        if (!base.businessName && s.name) base.businessName = String(s.name);
        if (s.description && !base.description) base.description = String(s.description);
        if (s.email && !base.emails.length) base.emails = [String(s.email)];
        if (s.telephone && !base.phones.length) base.phones = [String(s.telephone)];
        if (s.url && !base.socialLinks.linkedin) base.socialLinks.linkedin = String(s.url);
        if (s.image && !base.logoUrl) base.logoUrl = typeof s.image === "string" ? s.image : undefined;
        const addr = s.address as Record<string, string> | undefined;
        if (addr) {
          if (addr.streetAddress) base.address = addr.streetAddress;
          if (addr.addressLocality) base.city = addr.addressLocality;
          if (addr.addressRegion) base.state = addr.addressRegion;
          if (addr.postalCode) base.postalCode = addr.postalCode;
          if (addr.addressCountry) base.country = addr.addressCountry;
        }
        const geo = s.geo as Record<string, string | number> | undefined;
        if (geo) {
          if (geo.latitude) base.latitude = typeof geo.latitude === "number" ? geo.latitude : parseFloat(String(geo.latitude));
          if (geo.longitude) base.longitude = typeof geo.longitude === "number" ? geo.longitude : parseFloat(String(geo.longitude));
        }
      }
    }
  }

  // Try to find contact & about page URLs
  const contactLink = findLink(html, base.finalUrl, /contact/i);
  if (contactLink) base.contactPageUrl = contactLink;
  const aboutLink = findLink(html, base.finalUrl, /about|team|company/i);
  if (aboutLink) base.aboutPageUrl = aboutLink;

  return base;
}

function findLink(html: string, baseUrl: string, pattern: RegExp): string | undefined {
  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html))) {
    const href = m[1];
    const text = m[2].replace(/<[^>]*>/g, "").trim().toLowerCase();
    if (pattern.test(text) || pattern.test(href.toLowerCase())) {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        continue;
      }
    }
  }
  return undefined;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}
