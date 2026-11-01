// Provider registry — declares available search sources and their capabilities.
// All providers listed here are 100% free and require no API key.

export type ProviderId =
  | "web"          // Global web search via z-ai SDK
  | "linkedin"     // LinkedIn person profiles (site:linkedin.com/in)
  | "crunchbase"   // Crunchbase companies (site:crunchbase.com)
  | "producthunt"  // Product Hunt launches (site:producthunt.com)
  | "social"       // X, Reddit, IndieHackers, Stack Overflow, Mastodon
  | "youtube"      // YouTube oEmbed + web search
  | "business"     // OpenStreetMap Overpass (local businesses)
  | "github"       // GitHub public search
  | "wikipedia"    // Wikipedia
  | "hackernews"   // Hacker News (Algolia)
  | "crawler";     // Direct website crawler (enrichment)

export interface ProviderDef {
  id: ProviderId;
  name: string;
  group: "web" | "people" | "video" | "social" | "business" | "company" | "jobs" | "dev" | "product";
  description: string;
  requiresApiKey: false;
  apiKeyField?: never;
  isFree: true;
  capabilities: string[];
  attribution: string;
  rateLimitNote?: string;
}

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  web: {
    id: "web",
    name: "Global Web Search",
    group: "web",
    description: "Free, anonymous web search across the global internet. No tracking, no API key.",
    requiresApiKey: false,
    isFree: true,
    capabilities: ["web pages", "company websites", "directories", "news", "documents"],
    attribution: "Web search via z-ai-web-dev-sdk",
    rateLimitNote: "Fair-use rate limit (no key required)",
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn Profiles",
    group: "people",
    description: "Public LinkedIn person profiles via site:linkedin.com/in — name, position, company, location.",
    requiresApiKey: false,
    isFree: true,
    capabilities: ["person profiles", "name + headline", "position", "company", "location"],
    attribution: "LinkedIn public profiles via web search",
    rateLimitNote: "LinkedIn ToS apply to any outreach",
  },
  crunchbase: {
    id: "crunchbase",
    name: "Crunchbase Companies",
    group: "company",
    description: "Company/startup profiles via site:crunchbase.com — name, description, location, website.",
    requiresApiKey: false,
    isFree: true,
    capabilities: ["company profiles", "startups", "industry", "headquarters", "website"],
    attribution: "Crunchbase public profiles via web search",
  },
  producthunt: {
    id: "producthunt",
    name: "Product Hunt Products",
    group: "product",
    description: "Product launches and makers via site:producthunt.com — product name, makers, upvotes.",
    requiresApiKey: false,
    isFree: true,
    capabilities: ["product launches", "makers", "category", "upvotes"],
    attribution: "Product Hunt public pages via web search",
  },
  social: {
    id: "social",
    name: "Social & Community Profiles",
    group: "social",
    description: "Public profiles on X (Twitter), Reddit, IndieHackers, Stack Overflow, Mastodon.",
    requiresApiKey: false,
    isFree: true,
    capabilities: ["social handles", "developer profiles", "indie makers", "bio"],
    attribution: "Public social profiles via web search",
  },
  youtube: {
    id: "youtube",
    name: "YouTube Channels & Creators",
    group: "video",
    description: "Discover YouTube channels and creators via public oEmbed + indexed search. No API key required.",
    requiresApiKey: false,
    isFree: true,
    capabilities: ["channel search", "channel metadata", "public business emails"],
    attribution: "YouTube oEmbed + web search",
  },
  business: {
    id: "business",
    name: "Local Businesses (OpenStreetMap)",
    group: "business",
    description: "Structured local business data from OpenStreetMap: restaurants, clinics, agencies, shops. Free & open.",
    requiresApiKey: false,
    isFree: true,
    capabilities: ["business name", "address", "phone", "website", "geo coordinates", "category"],
    attribution: "OpenStreetMap contributors (ODbL)",
    rateLimitNote: "2 concurrent requests max (Overpass policy)",
  },
  github: {
    id: "github",
    name: "GitHub Developers & Orgs",
    group: "dev",
    description: "Find developers, open-source maintainers, and tech companies on GitHub. 10 req/min unauthenticated.",
    requiresApiKey: false,
    isFree: true,
    capabilities: ["developer search", "company orgs", "blog links", "public email (if disclosed)"],
    attribution: "GitHub API",
    rateLimitNote: "10 requests/min unauthenticated",
  },
  wikipedia: {
    id: "wikipedia",
    name: "Wikipedia (Companies & People)",
    group: "company",
    description: "Discover notable companies, organisations, and public figures via Wikipedia.",
    requiresApiKey: false,
    isFree: true,
    capabilities: ["notable companies", "organisations", "public figures"],
    attribution: "Wikipedia / Wikimedia",
  },
  hackernews: {
    id: "hackernews",
    name: "Hacker News Stories",
    group: "company",
    description: "Tech-focused stories, founders, and product launches discussed on Hacker News.",
    requiresApiKey: false,
    isFree: true,
    capabilities: ["tech companies", "founders", "product launches"],
    attribution: "Hacker News (Algolia API)",
  },
  crawler: {
    id: "crawler",
    name: "Website Enrichment Crawler",
    group: "web",
    description: "Visits publicly accessible pages (homepage, contact, about) to extract structured business info.",
    requiresApiKey: false,
    isFree: true,
    capabilities: ["meta tags", "JSON-LD schema.org", "emails", "phones", "social links"],
    attribution: "Direct fetch (robots.txt respected)",
    rateLimitNote: "8s timeout per page, 1MB cap",
  },
};

export const PROVIDER_GROUPS: Array<{ id: ProviderDef["group"]; label: string; providers: ProviderId[] }> = [
  { id: "web",       label: "Web Search",                   providers: ["web"] },
  { id: "people",    label: "People & Professionals",       providers: ["linkedin", "social"] },
  { id: "video",     label: "Video & Creator Platforms",    providers: ["youtube"] },
  { id: "business",  label: "Businesses & Local Services",  providers: ["business"] },
  { id: "company",   label: "Company & Startup Research",    providers: ["crunchbase", "wikipedia", "hackernews"] },
  { id: "product",   label: "Products & Launches",          providers: ["producthunt"] },
  { id: "dev",       label: "Developer Communities",         providers: ["github"] },
];

export function getProvider(id: ProviderId): ProviderDef {
  return PROVIDERS[id];
}

export function listProviders(): ProviderDef[] {
  return Object.values(PROVIDERS);
}

// Optional BYOK providers — users can supply their own API keys to enable richer integrations.
// The app works fully without any of these.
export interface OptionalProviderDef {
  id: string;
  name: string;
  description: string;
  requiresApiKey: true;
  apiKeyField: string;
  docsUrl: string;
  freeTier?: string;
}

export const OPTIONAL_PROVIDERS: OptionalProviderDef[] = [
  {
    id: "brave",
    name: "Brave Search API",
    description: "Privacy-focused web search with rich snippets. Adds result diversity beyond DuckDuckGo.",
    requiresApiKey: true,
    apiKeyField: "BRAVE_API_KEY",
    docsUrl: "https://brave.com/search/api/",
    freeTier: "2,000 queries/month free",
  },
  {
    id: "exa",
    name: "Exa Search API",
    description: "Neural-embedding web search — excellent for semantic lead discovery.",
    requiresApiKey: true,
    apiKeyField: "EXA_API_KEY",
    docsUrl: "https://exa.ai",
    freeTier: "1,000 searches/month free",
  },
  {
    id: "youtube_data",
    name: "YouTube Data API v3",
    description: "Full YouTube search with channel stats, video counts, and richer metadata.",
    requiresApiKey: true,
    apiKeyField: "YOUTUBE_API_KEY",
    docsUrl: "https://developers.google.com/youtube/v3",
    freeTier: "10,000 quota units/day free",
  },
  {
    id: "google_places",
    name: "Google Places API",
    description: "Verified local business data with reviews and opening hours.",
    requiresApiKey: true,
    apiKeyField: "GOOGLE_PLACES_API_KEY",
    docsUrl: "https://developers.google.com/maps/documentation/places/web-service",
    freeTier: "Pay-as-you-go ($200 monthly credit)",
  },
  {
    id: "hunter",
    name: "Hunter.io (Email Enrichment)",
    description: "Find verified business emails by domain. Optional enrichment layer.",
    requiresApiKey: true,
    apiKeyField: "HUNTER_API_KEY",
    docsUrl: "https://hunter.io/api",
    freeTier: "25 searches/month free",
  },
  {
    id: "apollo",
    name: "Apollo.io (B2B Enrichment)",
    description: "B2B contact enrichment with verified emails and direct dials.",
    requiresApiKey: true,
    apiKeyField: "APOLLO_API_KEY",
    docsUrl: "https://apollo.io/api",
    freeTier: "Limited free tier",
  },
  {
    id: "ai",
    name: "AI Provider (OpenAI-compatible)",
    description: "Optional AI for advanced relevance scoring and summarization. Works without it.",
    requiresApiKey: true,
    apiKeyField: "AI_API_KEY",
    docsUrl: "https://platform.openai.com/docs/api-reference",
  },
];

// API configuration checklist (per spec section 27)
export const API_CHECKLIST: Array<{
  provider: string;
  purpose: string;
  apiKeyRequired: boolean;
  integrationStatus: "free_no_key" | "optional_byok" | "available_optional";
}> = [
  { provider: "Web Search (z-ai SDK)", purpose: "Global Web Search", apiKeyRequired: false, integrationStatus: "free_no_key" },
  { provider: "LinkedIn Profiles (site:)", purpose: "Person Discovery", apiKeyRequired: false, integrationStatus: "free_no_key" },
  { provider: "Crunchbase (site:)", purpose: "Company Discovery", apiKeyRequired: false, integrationStatus: "free_no_key" },
  { provider: "Product Hunt (site:)", purpose: "Product/Maker Discovery", apiKeyRequired: false, integrationStatus: "free_no_key" },
  { provider: "Social Profiles (X/Reddit/IH/SO/Mastodon)", purpose: "Social Handle Discovery", apiKeyRequired: false, integrationStatus: "free_no_key" },
  { provider: "OpenStreetMap Overpass", purpose: "Local Business Data", apiKeyRequired: false, integrationStatus: "free_no_key" },
  { provider: "YouTube oEmbed + Web", purpose: "YouTube Discovery", apiKeyRequired: false, integrationStatus: "free_no_key" },
  { provider: "GitHub Public API", purpose: "Developer Discovery", apiKeyRequired: false, integrationStatus: "free_no_key" },
  { provider: "Wikipedia API", purpose: "Notable Companies & People", apiKeyRequired: false, integrationStatus: "free_no_key" },
  { provider: "Hacker News (Algolia)", purpose: "Tech Companies & Founders", apiKeyRequired: false, integrationStatus: "free_no_key" },
  { provider: "Direct Web Crawler", purpose: "Website Enrichment", apiKeyRequired: false, integrationStatus: "free_no_key" },
  { provider: "Brave Search", purpose: "Additional Web Search", apiKeyRequired: true, integrationStatus: "optional_byok" },
  { provider: "Exa Search", purpose: "Semantic Web Search", apiKeyRequired: true, integrationStatus: "optional_byok" },
  { provider: "YouTube Data API v3", purpose: "Rich YouTube Metadata", apiKeyRequired: true, integrationStatus: "optional_byok" },
  { provider: "Google Places", purpose: "Verified Business Data", apiKeyRequired: true, integrationStatus: "optional_byok" },
  { provider: "Hunter.io", purpose: "Email Enrichment", apiKeyRequired: true, integrationStatus: "optional_byok" },
  { provider: "Apollo", purpose: "B2B Enrichment", apiKeyRequired: true, integrationStatus: "optional_byok" },
  { provider: "AI Provider", purpose: "Lead Classification", apiKeyRequired: true, integrationStatus: "optional_byok" },
];
