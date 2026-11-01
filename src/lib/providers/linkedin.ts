// Free LinkedIn discovery via web search — no API key required.
// Uses site:linkedin.com/in to surface public LinkedIn profile URLs,
// then parses the profile snippet to extract name, position, company, location.
//
// LinkedIn's own Terms of Service apply to any contact made using these leads.
// We only collect data that LinkedIn has chosen to expose publicly via search
// engines (LinkedIn allows search engines to index public profiles).

import { searchWebMulti, type WebResult } from "./web";

export interface LinkedInPerson {
  fullName: string;
  profileUrl: string;
  headline?: string;       // e.g. "Senior Marketing Manager at ACME"
  position?: string;       // parsed from headline
  company?: string;        // parsed from headline
  location?: string;
  industry?: string;
  snippet: string;
  thumbnailUrl?: string;
}

const POSITION_PATTERNS = [
  /\bat\s+([^|–—-]+)/i,                       // "Senior X at ACME"
  /\b@\s*([^|–—-]+)/i,                         // "X @ ACME"
  /\b(?:CEO|CTO|CMO|CFO|COO|Founder|Co-founder|Director|Manager|Head of|VP|President|Engineer|Developer|Designer|Consultant|Architect|Lead|Specialist|Analyst|Strategist|Recruiter|Accountant|Lawyer|Photographer|Editor|Writer|Producer|Host)\b[^|–—-]*/i,
];

// Extract "Position at Company" or "Position @ Company" from a LinkedIn headline.
function parseHeadline(headline: string): { position?: string; company?: string } {
  if (!headline) return {};
  // Most common: "Title at Company"
  const atMatch = headline.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return {
      position: atMatch[1].replace(/[|–—-].*$/, "").trim(),
      company: atMatch[2].replace(/[|–—-].*$/, "").trim(),
    };
  }
  // "Title @ Company"
  const atSign = headline.match(/^(.+?)\s+@\s+(.+)$/i);
  if (atSign) {
    return { position: atSign[1].trim(), company: atSign[2].trim() };
  }
  // "Title • Company • Location"
  const parts = headline.split(/\s*[•·|–—-]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { position: parts[0], company: parts[1] };
  }
  return { position: headline };
}

function extractName(result: WebResult): string {
  // LinkedIn profile titles are usually "First Last - Headline" or just "First Last"
  let name = result.title;
  // Strip common suffixes added by search engines
  name = name.replace(/\s*[-–—|]\s*linkedin\s*$/i, "");
  name = name.replace(/\s*[-–—|]\s*LinkedIn\s*Profile\s*$/i, "");
  name = name.replace(/\s*\(\d+\)\s*$/, ""); // trailing "(123)" connection counts
  name = name.replace(/\s*\|\s.*$/, "");
  name = name.replace(/\s+-\s.*$/, "");
  // If the title contains " - " treat the first part as the name
  const dashIdx = name.indexOf(" - ");
  if (dashIdx > 0) name = name.slice(0, dashIdx);
  return name.trim() || result.title;
}

function parseLocation(snippet: string): string | undefined {
  // LinkedIn snippets often end with "Location · 500+ connections"
  const locMatch = snippet.match(/([A-Z][a-zA-Z .'-]+(?:,\s*[A-Z][a-zA-Z .'-]+)?)\s*[·•]\s*\d+\+\s*connections/);
  if (locMatch) return locMatch[1].trim();
  // Or "Lives in X"
  const livesMatch = snippet.match(/Lives in\s+([A-Z][a-zA-Z .'-]+)/);
  if (livesMatch) return livesMatch[1].trim();
  return undefined;
}

// Reserved path segments that appear after /in/ on non-profile pages
// (e.g. business.linkedin.com/in/en/hire/resources/...). Real person profiles
// use /in/<vanity-name> where the vanity is the person's handle, never one of
// these reserved words.
const RESERVED_VANITY = new Set([
  "en", "de", "fr", "es", "pt", "it", "ja", "zh", "ko", "ar", "hi", "nl",
  "hire", "resources", "learning", "jobs", "talent", "sales", "recruiter",
  "business", "premium", "pulse", "company", "school", "showcase", "post",
  "posts", "feed", "events", "groups", "messaging", "notifications",
  "settings", "profile", "edit", "connections", "my-items", "saved",
]);

function isRealPersonProfile(url: string): { ok: boolean; normalized?: string } {
  // Accept only:
  //   linkedin.com/in/<vanity>
  //   www.linkedin.com/in/<vanity>
  //   <2-letter-country>.linkedin.com/in/<vanity>      e.g. de.linkedin.com/in/...
  // Reject subdomains like business.linkedin.com, learning.linkedin.com,
  // recruiter.linkedin.com — those serve articles, not person profiles.
  const m = url.match(/^https?:\/\/(?:([a-z]{2})\.|www\.)?linkedin\.com\/in\/([^/?#]+)/i);
  if (!m) return { ok: false };
  const vanity = decodeURIComponent(m[2]).toLowerCase();
  if (RESERVED_VANITY.has(vanity)) return { ok: false };
  // Real vanity names are 3–100 chars and contain word chars / hyphens
  if (vanity.length < 3 || vanity.length > 100) return { ok: false };
  if (!/^[a-z0-9][a-z0-9\-_]+$/.test(vanity)) return { ok: false };
  // Reconstruct canonical URL (drop country subdomain — www. canonical form)
  return { ok: true, normalized: `https://www.linkedin.com/in/${vanity}` };
}

export async function searchLinkedInPeople(query: string, maxResults = 25): Promise<LinkedInPerson[]> {
  // The query passed in might include "site:linkedin.com/in" already, or might be a
  // plain-text query like "marketing manager Berlin". Normalize.
  const cleaned = query.replace(/\bsite:linkedin\.com\/in\b/gi, "").replace(/"/g, "").trim();
  const linkedinQuery = `site:linkedin.com/in ${cleaned}`.trim();

  let results = await searchWebMulti(linkedinQuery, maxResults);

  // Retry 1: if we got nothing, drop trailing location words (often a city).
  // Retry 2: if still nothing, try the unquoted profession — the strict
  // quoted form sometimes returns zero real profile URLs because the search
  // backend redirects to hiring-guide articles instead of person profiles.
  if (results.length === 0) {
    const relaxed = cleaned
      .replace(/\b(in|near|at|of|the)\b/gi, " ")
      .split(/\s+/)
      .slice(0, -1)
      .join(" ")
      .trim();
    if (relaxed && relaxed !== cleaned) {
      results = await searchWebMulti(`site:linkedin.com/in ${relaxed}`.trim(), maxResults);
    }
  }
  if (results.length === 0) {
    // Unquoted retry — broader match, lets the filter pull out real profiles.
    const unquoted = cleaned.replace(/^"|"$/g, "").replace(/"\s+OR\s+"/g, " ").trim();
    if (unquoted && unquoted !== cleaned) {
      results = await searchWebMulti(`site:linkedin.com/in ${unquoted}`.trim(), maxResults);
    }
  }

  const people: LinkedInPerson[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    // Strict filter: only real /in/<vanity> person profiles.
    const check = isRealPersonProfile(r.url);
    if (!check.ok || !check.normalized) continue;
    const profileUrl = check.normalized;
    if (seen.has(profileUrl)) continue;
    seen.add(profileUrl);

    const fullName = extractName(r);
    // Headline = the part after the dash in the title, or the snippet
    let headline: string | undefined;
    const titleDash = r.title.indexOf(" - ");
    if (titleDash > 0) headline = r.title.slice(titleDash + 3).trim();
    if (!headline) {
      // Fallback to snippet (LinkedIn snippets often start with the headline)
      headline = r.snippet.split(/\s*[·•]\s*\d+\+\s*connections/)[0].trim();
      if (headline.length > 200 || headline.length < 5) headline = undefined;
    }
    const parsed = parseHeadline(headline || "");
    const location = parseLocation(r.snippet);

    people.push({
      fullName,
      profileUrl,
      headline,
      position: parsed.position,
      company: parsed.company,
      location,
      snippet: r.snippet,
    });

    if (people.length >= maxResults) break;
  }
  return people;
}
