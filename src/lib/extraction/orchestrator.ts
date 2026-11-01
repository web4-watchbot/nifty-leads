// Search orchestrator — runs queries across multiple free providers in parallel,
// normalises results, deduplicates, scores, and returns unified leads.

import { searchWeb } from "../providers/web";
import { searchOverpass } from "../providers/overpass";
import { searchGithubUsers } from "../providers/github";
import { searchWikipedia } from "../providers/wikipedia";
import { searchHackerNews } from "../providers/hackernews";
import { searchYouTubeChannels } from "../providers/youtube";
import { searchLinkedInPeople } from "../providers/linkedin";
import { searchCrunchbase } from "../providers/crunchbase";
import { searchProductHunt } from "../providers/producthunt";
import { searchSocialProfiles } from "../providers/social";
import { crawlWebsite } from "../providers/webcrawler";
import { buildProviderQueries, parseQuery } from "./query-parser";
import { scoreLead, generateSummary } from "./scoring";
import { findDuplicates, normalizeDomain, type LeadFingerprint } from "./dedup";
import type { ProviderId } from "../providers";
import type { UnifiedLead } from "./types";

export interface SearchOptions {
  query: string;
  sources: ProviderId[];
  location?: string;
  industry?: string;
  leadType?: string;
  maxResults?: number;
  enrichWebsites?: boolean;     // crawl discovered sites for richer data
  maxSitesToCrawl?: number;
  signal?: AbortSignal;
}

export interface SearchOutcome {
  leads: UnifiedLead[];
  rawCounts: Record<ProviderId, number>;
  errors: Record<ProviderId, string>;
  durationMs: number;
  generatedQueries: string[];
  dedupedCount: number;
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  web: "Web Search",
  linkedin: "LinkedIn",
  crunchbase: "Crunchbase",
  producthunt: "Product Hunt",
  social: "Social Profiles",
  youtube: "YouTube",
  business: "OpenStreetMap",
  github: "GitHub",
  wikipedia: "Wikipedia",
  hackernews: "Hacker News",
  crawler: "Website Crawler",
};

export async function runSearch(opts: SearchOptions): Promise<SearchOutcome> {
  const start = Date.now();
  const { query, sources, location, industry, leadType } = opts;
  const maxResults = opts.maxResults ?? 50;
  const enrichWebsites = opts.enrichWebsites ?? true;
  const maxSitesToCrawl = opts.maxSitesToCrawl ?? 5;

  const parsed = parseQuery(query);
  const providerQueries = buildProviderQueries(parsed);
  const generatedQueries = Object.values(providerQueries).filter(Boolean);

  const rawCounts: Record<ProviderId, number> = {} as Record<ProviderId, number>;
  const errors: Record<ProviderId, string> = {} as Record<ProviderId, string>;
  const allLeads: UnifiedLead[] = [];

  // Run providers in parallel, but isolate failures so one bad provider doesn't kill the search.
  const tasks: Array<Promise<void>> = [];

  if (sources.includes("web")) {
    tasks.push(runProviderSafely("web", async (signal) => {
      const q = providerQueries.web || query;
      const rawResults = await searchWeb(q, maxResults);
      rawCounts.web = rawResults.length;
      for (const r of rawResults) {
        // Some web-search backends return google.com/goto?url=... redirects.
        // Resolve the embedded URL so leads point at the real page, not Google.
        let finalUrl = r.url;
        const goto = r.url.match(/[?&]url=([^&]+)/i) || r.url.match(/goto\?url=([^&]+)/i);
        if (goto) {
          try {
            const real = decodeURIComponent(goto[1]);
            if (/^https?:\/\//i.test(real)) finalUrl = real;
          } catch {
            // ignore decode errors
          }
        }
        // Skip obvious Google/redirect URLs that we couldn't resolve — they're
        // not real business pages and would clutter the results.
        if (/google\.com\/(?:goto|search|url)/i.test(finalUrl)) continue;

        const lead: UnifiedLead = {
          businessName: r.title.split(/\s+[—\-|]\s+/)[0] || r.title,
          description: r.snippet,
          website: safeUrl(finalUrl),
          sourceProvider: "web",
          sourceUrl: finalUrl,
          sources: [{ provider: "web", url: finalUrl, title: r.title, date: new Date().toISOString() }],
          emailStatus: "not_found",
          phoneStatus: "not_found",
          verificationStatus: "unverified",
          industry: inferIndustry(r.title + " " + r.snippet) || industry,
        };
        allLeads.push(lead);
      }
    }, errors, signalFrom(opts.signal)));
  }

  if (sources.includes("linkedin")) {
    tasks.push(runProviderSafely("linkedin", async () => {
      // For LinkedIn we always re-issue a clean site:linkedin.com/in query so we
      // get actual profile URLs, even when the user typed a generic query.
      const q = providerQueries.linkedin || `${parsed.text} ${location || ""}`.trim() || query;
      const people = await searchLinkedInPeople(q, maxResults);
      rawCounts.linkedin = people.length;
      for (const p of people) {
        const lead: UnifiedLead = {
          contactPerson: p.fullName,
          position: p.position,
          businessName: p.company,
          description: p.headline || p.snippet,
          // Do NOT set website = profileUrl — that would collapse all LinkedIn
          // profiles into one dedup bucket (all on linkedin.com). Keep the URL
          // only in linkedinUrl + sourceUrl so dedup uses name+position signals.
          linkedinUrl: p.profileUrl,
          location: p.location,
          city: p.location?.split(",")[0],
          country: p.location?.split(",").slice(-1)[0]?.trim(),
          industry: industry,
          leadType: leadType as UnifiedLead["leadType"] || (p.position && /ceo|cto|cmo|cfo|founder|vp|director|head of/i.test(p.position) ? "decision_maker" : "individual"),
          emailStatus: "not_found",
          phoneStatus: "not_found",
          verificationStatus: "unverified",
          sourceProvider: "linkedin",
          sourceUrl: p.profileUrl,
          sources: [{ provider: "linkedin", url: p.profileUrl, title: p.fullName, date: new Date().toISOString() }],
        };
        allLeads.push(lead);
      }
    }, errors, signalFrom(opts.signal)));
  }

  if (sources.includes("crunchbase")) {
    tasks.push(runProviderSafely("crunchbase", async () => {
      const q = providerQueries.crunchbase || `${parsed.text} ${location || ""}`.trim() || query;
      const companies = await searchCrunchbase(q, maxResults);
      rawCounts.crunchbase = companies.length;
      for (const c of companies) {
        const lead: UnifiedLead = {
          businessName: c.companyName,
          description: c.description,
          // Use the company's own website (parsed from snippet), NOT the
          // crunchbase.com URL — that would collapse all Crunchbase companies
          // into one dedup bucket.
          website: c.companyWebsite,
          location: c.location,
          city: c.location?.split(",")[0],
          country: c.location?.split(",").slice(-1)[0]?.trim(),
          industry: industry,
          leadType: "company",
          emailStatus: "not_found",
          phoneStatus: "not_found",
          verificationStatus: "unverified",
          sourceProvider: "crunchbase",
          sourceUrl: c.crunchbaseUrl,
          sources: [{ provider: "crunchbase", url: c.crunchbaseUrl, title: c.companyName, date: new Date().toISOString() }],
        };
        allLeads.push(lead);
      }
    }, errors, signalFrom(opts.signal)));
  }

  if (sources.includes("producthunt")) {
    tasks.push(runProviderSafely("producthunt", async () => {
      const q = providerQueries.producthunt || parsed.text || query;
      const products = await searchProductHunt(q, maxResults);
      rawCounts.producthunt = products.length;
      for (const p of products) {
        const lead: UnifiedLead = {
          businessName: p.productName,
          description: p.description,
          // Do NOT set website = producthunt.com URL — that would make every
          // ProductHunt result collapse into a single dedup bucket (same domain).
          // Leave website undefined unless we extracted the company's own domain.
          website: p.website,
          industry: p.category || industry,
          leadType: "company",
          emailStatus: "not_found",
          phoneStatus: "not_found",
          verificationStatus: "unverified",
          sourceProvider: "producthunt",
          sourceUrl: p.productUrl,
          sources: [{ provider: "producthunt", url: p.productUrl, title: p.productName, date: new Date().toISOString() }],
        };
        // If makers are listed in the snippet, attach as additional context
        if (p.makers && p.makers.length) {
          lead.description = (lead.description || "") + ` · Makers: ${p.makers.join(", ")}`;
        }
        allLeads.push(lead);
      }
    }, errors, signalFrom(opts.signal)));
  }

  if (sources.includes("social")) {
    tasks.push(runProviderSafely("social", async () => {
      const q = providerQueries.social || `${parsed.text} ${location || ""}`.trim() || query;
      const profiles = await searchSocialProfiles(q, maxResults);
      rawCounts.social = profiles.length;
      for (const p of profiles) {
        // Map platform to the right URL field on the lead
        const lead: UnifiedLead = {
          contactPerson: p.displayName || p.username,
          businessName: p.displayName,
          description: p.bio || p.snippet,
          // Do NOT set website = profileUrl — that would collapse all X/Twitter
          // profiles into one dedup bucket (all on x.com). The URL is preserved
          // in xUrl / otherProfiles / sourceUrl so dedup uses name signals.
          industry: industry,
          leadType: leadType as UnifiedLead["leadType"] || "individual",
          emailStatus: "not_found",
          phoneStatus: "not_found",
          verificationStatus: "unverified",
          sourceProvider: "social",
          sourceUrl: p.profileUrl,
          sources: [{ provider: "social", url: p.profileUrl, title: p.displayName || p.username, date: new Date().toISOString() }],
        };
        if (p.platform === "twitter") {
          lead.xUrl = p.profileUrl;
          lead.contactPerson = lead.contactPerson || `@${p.username}`;
        } else if (p.platform === "reddit") {
          lead.otherProfiles = [p.profileUrl];
        } else if (p.platform === "stackoverflow") {
          lead.otherProfiles = [p.profileUrl];
        } else if (p.platform === "mastodon") {
          lead.otherProfiles = [p.profileUrl];
        } else if (p.platform === "indiehackers") {
          lead.otherProfiles = [p.profileUrl];
        }
        allLeads.push(lead);
      }
    }, errors, signalFrom(opts.signal)));
  }

  if (sources.includes("youtube")) {
    tasks.push(runProviderSafely("youtube", async () => {
      const channels = await searchYouTubeChannels(providerQueries.youtube || parsed.text || query, maxResults);
      rawCounts.youtube = channels.length;
      for (const c of channels) {
        const lead: UnifiedLead = {
          businessName: c.channelName,
          description: c.description,
          website: c.channelUrl,
          youtubeUrl: c.channelUrl,
          email: c.businessEmail,
          emailStatus: c.businessEmail ? "publicly_listed" : "not_found",
          phoneStatus: "not_found",
          verificationStatus: "unverified",
          leadType: "creator",
          thumbnailUrl: c.thumbnail,
          sourceProvider: "youtube",
          sourceUrl: c.channelUrl,
          sources: [{ provider: "youtube", url: c.channelUrl, title: c.channelName, date: new Date().toISOString() }],
        };
        allLeads.push(lead);
      }
    }, errors, signalFrom(opts.signal)));
  }

  if (sources.includes("business")) {
    tasks.push(runProviderSafely("business", async () => {
      const q = providerQueries.overpass || `${industry || ""} ${location || ""} ${parsed.text}`.trim();
      const businesses = await searchOverpass(q, maxResults);
      rawCounts.business = businesses.length;
      for (const b of businesses) {
        const lead: UnifiedLead = {
          businessName: b.name,
          phone: b.phone,
          email: b.email,
          website: b.website,
          address: b.address,
          city: b.city,
          state: b.state,
          country: b.country,
          postalCode: b.postcode,
          latitude: b.lat,
          longitude: b.lon,
          industry: b.category || industry,
          leadType: "local_service",
          emailStatus: b.email ? "publicly_listed" : "not_found",
          phoneStatus: b.phone ? "publicly_listed" : "not_found",
          verificationStatus: "verified", // OSM data is community-reviewed
          sourceProvider: "business",
          sourceUrl: b.osmId ? `https://www.openstreetmap.org/${b.osmType}/${b.osmId}` : b.website || "",
          sources: [{
            provider: "business",
            url: b.osmId ? `https://www.openstreetmap.org/${b.osmType}/${b.osmId}` : b.website || "",
            title: b.name,
            date: new Date().toISOString(),
          }],
        };
        allLeads.push(lead);
      }
    }, errors, signalFrom(opts.signal)));
  }

  if (sources.includes("github")) {
    tasks.push(runProviderSafely("github", async () => {
      const users = await searchGithubUsers(providerQueries.github || query, Math.min(maxResults, 20));
      rawCounts.github = users.length;
      for (const u of users) {
        const lead: UnifiedLead = {
          businessName: u.type === "Organization" ? (u.name || u.login) : u.name || u.login,
          contactPerson: u.type === "User" ? (u.name || u.login) : undefined,
          position: u.type === "Organization" ? "Organization" : "Developer",
          description: u.bio,
          website: u.blog,
          email: u.email,
          githubUrl: u.htmlUrl,
          location: u.location,
          city: u.location?.split(",")[0],
          country: u.location?.split(",").slice(-1)[0]?.trim(),
          industry: u.company || (u.type === "Organization" ? "Technology" : undefined),
          leadType: u.type === "Organization" ? "company" : "freelancer",
          emailStatus: u.email ? "verified" : "not_found",
          phoneStatus: "not_found",
          verificationStatus: "verified",
          thumbnailUrl: u.avatarUrl,
          sourceProvider: "github",
          sourceUrl: u.htmlUrl,
          sources: [{ provider: "github", url: u.htmlUrl, title: u.login, date: new Date().toISOString() }],
        };
        allLeads.push(lead);
      }
    }, errors, signalFrom(opts.signal)));
  }

  if (sources.includes("wikipedia")) {
    tasks.push(runProviderSafely("wikipedia", async () => {
      const results = await searchWikipedia(providerQueries.wikipedia || query, Math.min(maxResults, 10));
      rawCounts.wikipedia = results.length;
      for (const r of results) {
        const lead: UnifiedLead = {
          businessName: r.title,
          description: r.extract,
          website: r.url,
          industry: industry,
          leadType: "company",
          emailStatus: "not_found",
          phoneStatus: "not_found",
          verificationStatus: "verified",
          sourceProvider: "wikipedia",
          sourceUrl: r.url,
          sources: [{ provider: "wikipedia", url: r.url, title: r.title, date: new Date().toISOString() }],
        };
        allLeads.push(lead);
      }
    }, errors, signalFrom(opts.signal)));
  }

  if (sources.includes("hackernews")) {
    tasks.push(runProviderSafely("hackernews", async () => {
      const results = await searchHackerNews(providerQueries.hn || query, Math.min(maxResults, 15));
      rawCounts.hackernews = results.length;
      for (const r of results) {
        const lead: UnifiedLead = {
          businessName: r.title,
          description: r.storyText || `Posted by ${r.author} • ${r.points} points`,
          website: r.url,
          industry: industry,
          leadType: "company",
          emailStatus: "not_found",
          phoneStatus: "not_found",
          verificationStatus: "unverified",
          sourceProvider: "hackernews",
          sourceUrl: r.hnUrl,
          sources: [{ provider: "hackernews", url: r.hnUrl, title: r.title, date: r.createdAt }],
        };
        allLeads.push(lead);
      }
    }, errors, signalFrom(opts.signal)));
  }

  await Promise.allSettled(tasks);

  // Optional website enrichment — crawl top N sites for structured data
  if (enrichWebsites && allLeads.length) {
    const toEnrich = allLeads
      .filter((l) => l.website && l.sourceProvider !== "business" && l.sourceProvider !== "github")
      .slice(0, maxSitesToCrawl);
    await Promise.allSettled(
      toEnrich.map(async (lead) => {
        try {
          const crawled = await crawlWebsite(lead.website!);
          if (crawled.businessName && !lead.businessName) lead.businessName = crawled.businessName;
          if (crawled.description && (!lead.description || lead.description.length < 50)) lead.description = crawled.description;
          if (crawled.emails.length && !lead.email) {
            lead.email = crawled.emails[0];
            lead.emailExtra = crawled.emails.slice(1, 4);
            lead.emailStatus = "publicly_listed";
          } else if (crawled.emails.length && lead.email) {
            lead.emailExtra = crawled.emails.filter((e) => e !== lead.email).slice(0, 3);
          }
          if (crawled.phones.length && !lead.phone) {
            lead.phone = crawled.phones[0];
            lead.phoneExtra = crawled.phones.slice(1, 3);
            lead.phoneStatus = "publicly_listed";
          }
          if (crawled.address && !lead.address) lead.address = crawled.address;
          if (crawled.city && !lead.city) lead.city = crawled.city;
          if (crawled.country && !lead.country) lead.country = crawled.country;
          if (crawled.postalCode && !lead.postalCode) lead.postalCode = crawled.postalCode;
          if (crawled.latitude && !lead.latitude) lead.latitude = crawled.latitude;
          if (crawled.longitude && !lead.longitude) lead.longitude = crawled.longitude;
          if (crawled.industry && !lead.industry) lead.industry = crawled.industry;
          if (crawled.logoUrl) lead.thumbnailUrl = lead.thumbnailUrl || crawled.logoUrl;
          // Merge social links
          if (crawled.socialLinks.linkedin) lead.linkedinUrl = lead.linkedinUrl || crawled.socialLinks.linkedin;
          if (crawled.socialLinks.twitter) lead.xUrl = lead.xUrl || crawled.socialLinks.twitter;
          if (crawled.socialLinks.facebook) lead.facebookUrl = lead.facebookUrl || crawled.socialLinks.facebook;
          if (crawled.socialLinks.instagram) lead.instagramUrl = lead.instagramUrl || crawled.socialLinks.instagram;
          if (crawled.socialLinks.youtube) lead.youtubeUrl = lead.youtubeUrl || crawled.socialLinks.youtube;
          if (crawled.socialLinks.github) lead.githubUrl = lead.githubUrl || crawled.socialLinks.github;
          if (crawled.contactPageUrl) lead.contactPageUrl = crawled.contactPageUrl;
          // Append source
          lead.sources.push({ provider: "crawler", url: crawled.finalUrl, title: crawled.title, date: new Date().toISOString() });
        } catch {
          // enrichment failure is non-fatal
        }
      })
    );
  }

  // Deduplicate
  const fingerprints: LeadFingerprint[] = allLeads.map((l, i) => ({
    id: String(i),
    businessName: l.businessName,
    website: l.website,
    email: l.email,
    phone: l.phone,
    city: l.city,
    country: l.country,
    sourceProvider: l.sourceProvider,
    sourceUrl: l.sourceUrl,
  }));
  const dupes = findDuplicates(fingerprints);
  const toRemove = new Set<string>();
  const mergedSources = new Map<string, Array<{ provider: ProviderId; url: string; title: string; date: string }>>();
  for (const d of dupes) {
    const aIdx = parseInt(d.aId);
    const bIdx = parseInt(d.bId);
    const a = allLeads[aIdx];
    const b = allLeads[bIdx];
    // Pick winner: OSM/GitHub verified > LinkedIn/Crunchbase > enriched web > plain web
    const priority: Record<ProviderId, number> = { business: 5, github: 5, wikipedia: 4, crunchbase: 4, producthunt: 3, linkedin: 4, youtube: 3, social: 3, hackernews: 3, web: 2, crawler: 1 };
    const aScore = (priority[a.sourceProvider] || 0) + (a.completenessScore || 0) / 100;
    const bScore = (priority[b.sourceProvider] || 0) + (b.completenessScore || 0) / 100;
    const winner = aScore >= bScore ? a : b;
    const loser = winner === a ? b : a;
    toRemove.add(loser === a ? d.aId : d.bId);
    // Merge sources
    const existingSources = mergedSources.get(d.aId) || a.sources;
    const merged = [...existingSources, ...loser.sources];
    mergedSources.set(d.aId, merged);
    // Backfill missing fields from loser into winner
    for (const key of Object.keys(loser) as Array<keyof UnifiedLead>) {
      if (!winner[key] && loser[key]) (winner as unknown as Record<string, unknown>)[key] = loser[key];
    }
  }
  if (toRemove.size) {
    for (const [id, srcs] of mergedSources.entries()) {
      allLeads[parseInt(id)].sources = srcs;
    }
  }
  const dedupedLeads = allLeads.filter((_, i) => !toRemove.has(String(i)));
  const dedupedCount = allLeads.length - dedupedLeads.length;

  // Score & summarize
  for (const lead of dedupedLeads) {
    const s = scoreLead({
      query,
      businessName: lead.businessName,
      description: lead.description,
      industry: lead.industry,
      city: lead.city,
      country: lead.country,
      website: lead.website,
      email: lead.email,
      emailExtra: lead.emailExtra?.join(","),
      phone: lead.phone,
      phoneExtra: lead.phoneExtra?.join(","),
      address: lead.address,
      linkedinUrl: lead.linkedinUrl,
      youtubeUrl: lead.youtubeUrl,
      instagramUrl: lead.instagramUrl,
      facebookUrl: lead.facebookUrl,
      xUrl: lead.xUrl,
      githubUrl: lead.githubUrl,
      sourceProvider: lead.sourceProvider,
    });
    lead.relevanceScore = s.relevanceScore;
    lead.completenessScore = s.completenessScore;
    lead.relevanceReason = s.relevanceReason;
    lead.aiSummary = generateSummary({
      query,
      businessName: lead.businessName,
      description: lead.description,
      industry: lead.industry,
      city: lead.city,
      country: lead.country,
      website: lead.website,
      email: lead.email,
      phone: lead.phone,
      linkedinUrl: lead.linkedinUrl,
      youtubeUrl: lead.youtubeUrl,
    });
    if (leadType) lead.leadType = leadType as UnifiedLead["leadType"];
  }

  // Sort by relevance + completeness
  dedupedLeads.sort((a, b) => (b.relevanceScore! + b.completenessScore!) - (a.relevanceScore! + a.completenessScore!));

  return {
    leads: dedupedLeads,
    rawCounts,
    errors,
    durationMs: Date.now() - start,
    generatedQueries,
    dedupedCount,
  };
}

function signalFrom(signal?: AbortSignal): AbortSignal | undefined {
  return signal;
}

async function runProviderSafely(
  provider: ProviderId,
  fn: (signal?: AbortSignal) => Promise<void>,
  errors: Record<string, string>,
  signal?: AbortSignal,
): Promise<void> {
  try {
    await fn(signal);
  } catch (e) {
    errors[provider] = (e as Error).message || "Unknown error";
  }
}

function safeUrl(u: string): string | undefined {
  try {
    new URL(u);
    return u;
  } catch {
    return undefined;
  }
}

const INDUSTRY_KEYWORDS: Array<{ keywords: string[]; industry: string }> = [
  { keywords: ["restaurant", "cafe", "bar", "pub", "catering", "food"], industry: "Hospitality" },
  { keywords: ["hotel", "motel", "resort", "accommodation", "tourism"], industry: "Hospitality" },
  { keywords: ["hospital", "clinic", "medical", "health", "dental", "pharma"], industry: "Healthcare" },
  { keywords: ["school", "college", "university", "education", "training", "course"], industry: "Education" },
  { keywords: ["account", "audit", "tax", "bookkeeping", "finance"], industry: "Finance" },
  { keywords: ["marketing", "advertising", "seo", "branding", "social media"], industry: "Marketing" },
  { keywords: ["software", "saas", "app", "developer", "it ", "tech ", "cloud", "ai"], industry: "Technology" },
  { keywords: ["real estate", "property", "realtor", "estate agent"], industry: "Real Estate" },
  { keywords: ["lawyer", "attorney", "legal", "law firm"], industry: "Legal" },
  { keywords: ["recruit", "staffing", "hr ", "human resource"], industry: "Recruitment" },
  { keywords: ["manufactur", "factory", "production", "industrial"], industry: "Manufacturing" },
  { keywords: ["ecommerce", "e-commerce", "online store", "shop", "retail"], industry: "Retail" },
];

function inferIndustry(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const { keywords, industry } of INDUSTRY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return industry;
  }
  return undefined;
}

// Export labels for UI use
export { PROVIDER_LABELS, normalizeDomain };
