// Brave Search API client — free tier: 2,000 queries/month, no credit card.
// Sign up at https://brave.com/search/api/ and set BRAVE_API_KEY in your .env.
//
// Why Brave? It has its own independent index (not Google/Bing), so it surfaces
// different LinkedIn profiles, Crunchbase companies, etc. than the z.ai SDK's
// Google-backed search. Used as an optional first backend in the web-search
// chain; we fall back to z.ai when no key is configured or Brave errors out.

import type { WebResult } from "./web";

export interface BraveSearchOptions {
  /** Country code (e.g. "US", "DE", "IN"). Empty = worldwide. */
  country?: string;
  /** Result language code (e.g. "en", "de"). */
  language?: string;
  /** When true, issue the query verbatim — no spelling correction / relaxation. */
  exact?: boolean;
}

const BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

export function isBraveConfigured(): boolean {
  return !!process.env.BRAVE_API_KEY;
}

export async function searchBrave(query: string, maxResults = 25, opts: BraveSearchOptions = {}): Promise<WebResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!query.trim() || !apiKey) return [];

  const url = new URL(BRAVE_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(Math.min(maxResults, 50)));
  // Brave's free tier is the "Web Search" endpoint — filter to web results only
  url.searchParams.set("result_filter", "web");
  if (opts.country) url.searchParams.set("country", opts.country);
  if (opts.language) url.searchParams.set("search_lang", opts.language);
  // Freshness filter omitted — we want the broadest result set.

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      // 401 = bad key, 429 = rate limited, 422 = bad query
      // We log nothing sensitive — just return empty so caller can fall back.
      return [];
    }
    const data = (await res.json()) as {
      web?: {
        results?: Array<{
          url?: string;
          title?: string;
          description?: string;
          language?: string;
          family_friendly?: boolean;
        }>;
      };
      query?: { original?: string };
    };
    const results = data.web?.results || [];
    return results
      .filter((r) => r.url && r.title)
      .map((r, i) => ({
        title: r.title!,
        url: r.url!,
        displayUrl: safeHostname(r.url!),
        snippet: r.description || "",
        position: i + 1,
      }));
  } catch {
    return [];
  }
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
