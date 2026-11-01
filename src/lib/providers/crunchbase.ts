// Free Crunchbase discovery via web search — no API key required.
// Crunchbase organizes companies by industry hub pages (e.g. /hub/saas-companies,
// /hub/berlin-content-marketing-companies). We use site:crunchbase.com to surface
// those hubs and individual company pages, then extract company names + URLs from
// the indexed snippets.

import { searchWebMulti, type WebResult } from "./web";

export interface CrunchbaseCompany {
  companyName: string;
  crunchbaseUrl: string;
  companyWebsite?: string;     // extracted from snippet when available
  description?: string;
  industry?: string;
  location?: string;
  snippet: string;
}

function extractCompanyFromTitle(title: string): string {
  // Crunchbase page titles are usually "Company Name: ...", "Company - Crunchbase",
  // or hub titles like "Berlin Content Marketing Companies"
  let t = title.replace(/\s*[-–—|]\s*Crunchbase.*$/i, "").trim();
  const colon = t.indexOf(": ");
  if (colon > 0 && colon < 80) t = t.slice(0, colon);
  return t;
}

function extractFromSnippet(snippet: string): {
  website?: string;
  description?: string;
  location?: string;
} {
  const out: { website?: string; description?: string; location?: string } = {};
  // Crunchbase snippets often look like:
  // "Acme Corp. | Software. Founded 2019. acme.com. Berlin."
  // We pick out the URL-like token as the website
  const urlMatch = snippet.match(/\b([a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?(?:\/\S+)?)/i);
  if (urlMatch && !urlMatch[1].match(/^crunchbase/i)) {
    const cand = urlMatch[1];
    // Filter out obvious non-domains
    if (!cand.match(/^\d/)) out.website = `https://${cand.replace(/\/$/, "")}`;
  }
  // Location: usually near "Headquarters" or after "Founded YYYY"
  const hqMatch = snippet.match(/(?:Headquarters|HQ|Based in|Location)\s*[:\|]?\s*([A-Z][a-zA-Z .,'-]+(?:,\s*[A-Z][a-zA-Z .'-]+)?)/);
  if (hqMatch) out.location = hqMatch[1].split(/\s*[·•|]/)[0].trim();
  else {
    const foundedMatch = snippet.match(/Founded\s+\d{4}\.?\s+([A-Z][a-zA-Z .,'-]+)/);
    if (foundedMatch) out.location = foundedMatch[1].trim();
  }
  // Description = first sentence before the company facts
  const descEnd = snippet.search(/\s+(?:Founded|Headquarters|HQ|Based in|Stage|Funding|Investors|Crunchbase)/i);
  if (descEnd > 30) out.description = snippet.slice(0, descEnd).trim();
  return out;
}

export async function searchCrunchbase(query: string, maxResults = 25): Promise<CrunchbaseCompany[]> {
  // Build a query that targets Crunchbase. If user already typed site:crunchbase.com
  // we keep it; otherwise we add it.
  const cleaned = query.replace(/\bsite:crunchbase\.com\b/gi, "").replace(/"/g, "").trim();
  const cbQuery = `site:crunchbase.com ${cleaned}`.trim();
  const results = await searchWebMulti(cbQuery, maxResults);

  const companies: CrunchbaseCompany[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (!/crunchbase\.com\//i.test(r.url)) continue;
    // Skip search/organization hub pages — we want organization pages
    const isOrg = /crunchbase\.com\/organization\//i.test(r.url);
    const isHub = /crunchbase\.com\/hub\//i.test(r.url);
    if (!isOrg && !isHub) continue;

    if (seen.has(r.url)) continue;
    seen.add(r.url);

    const companyName = extractCompanyFromTitle(r.title);
    const extracted = extractFromSnippet(r.snippet);

    companies.push({
      companyName,
      crunchbaseUrl: r.url,
      companyWebsite: extracted.website,
      description: extracted.description || r.snippet,
      location: extracted.location,
      snippet: r.snippet,
      // If this is a hub page (e.g. /hub/saas-companies), it's not a single company
      industry: isHub ? "Directory" : undefined,
    });

    if (companies.length >= maxResults) break;
  }
  return companies;
}
