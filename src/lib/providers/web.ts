// Free web search via z-ai-web-dev-sdk (no API key required — runs server-side).
// Replaces the DuckDuckGo HTML scraper which gets blocked by anti-bot systems.
// Returns rich structured results: url, name, snippet, host_name, rank, date.

import ZAI from "z-ai-web-dev-sdk";
import { searchBrave } from "./brave";

export interface WebResult {
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
  position: number;
  date?: string;
}

let zaiPromise: Promise<any> | null = null;
async function getZai() {
  if (!zaiPromise) zaiPromise = ZAI.create();
  return zaiPromise;
}

// Simple in-flight mutex: the underlying web_search backend sometimes returns
// short/empty results when many requests overlap, so we serialize calls.
let inflight: Promise<any> | null = null;

export async function searchWeb(query: string, maxResults = 25): Promise<WebResult[]> {
  if (!query.trim()) return [];
  // Chain on the previous in-flight request so only one web_search runs at a time.
  const prev = inflight || Promise.resolve();
  const run = prev.then(() => doSearch(query, maxResults));
  inflight = run.catch(() => null);
  // Don't let a failure block the next caller.
  run.finally(() => {
    if (inflight === run.catch(() => null)) inflight = null;
  });
  return run;
}

async function doSearch(query: string, maxResults: number): Promise<WebResult[]> {
  const zai = await getZai();
  const results = (await zai.functions.invoke("web_search", {
    query,
    num: Math.min(maxResults, 50),
  })) as Array<{
    url: string;
    name: string;
    snippet: string;
    host_name?: string;
    rank?: number;
    date?: string;
  }>;

  return (results || []).map((r, i) => ({
    title: r.name || r.url,
    url: r.url,
    displayUrl: r.host_name || safeHostname(r.url),
    snippet: r.snippet || "",
    position: i + 1,
    date: r.date || undefined,
  }));
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Normalize a URL for dedup: strip protocol, www., trailing slash, query params,
// and lowercase the host. So:
//   https://www.linkedin.com/in/john/?trk=... → linkedin.com/in/john
function normalizeUrlForDedup(url: string): string {
  try {
    const u = new URL(url);
    let path = u.pathname.replace(/\/+$/, "");
    return (u.hostname.replace(/^www\./, "") + path).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Multi-backend web search — the "free combo" pipeline.
 *
 * 1. If BRAVE_API_KEY is set, query Brave first (independent index → different
 *    LinkedIn profiles, Crunchbase companies, etc. than Google's).
 * 2. Always query z.ai's web_search (Google-backed) as the primary backend —
 *    it's free and requires no key.
 * 3. Merge results, dedupe by normalized URL (Brave hits win — they're
 *    independent and tend to surface real profile pages more reliably for
 *    site: queries), and return up to maxResults.
 *
 * This gives users a 100%-free combo (z.ai alone) that upgrades automatically
 * to a richer combo (z.ai + Brave) the moment they drop a Brave key into .env.
 */
export async function searchWebMulti(query: string, maxResults = 25): Promise<WebResult[]> {
  if (!query.trim()) return [];

  // Run both backends in parallel when Brave is configured; otherwise just z.ai.
  const bravePromise = isBraveAvailable()
    ? searchBrave(query, maxResults).catch(() => [] as WebResult[])
    : Promise.resolve([] as WebResult[]);
  const zaiPromise = searchWeb(query, maxResults).catch(() => [] as WebResult[]);

  const [braveResults, zaiResults] = await Promise.all([bravePromise, zaiPromise]);

  // Merge: Brave first (independent index), then z.ai results whose URL we
  // haven't already seen.
  const seen = new Set<string>();
  const merged: WebResult[] = [];
  let pos = 1;
  for (const r of [...braveResults, ...zaiResults]) {
    const key = normalizeUrlForDedup(r.url);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...r, position: pos++ });
    if (merged.length >= maxResults) break;
  }
  return merged;
}

function isBraveAvailable(): boolean {
  return !!process.env.BRAVE_API_KEY;
}
