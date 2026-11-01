// Free Product Hunt discovery via web search — finds product launches, makers,
// and the people behind them. No API key required.
//
// Product Hunt maker/launch URLs are publicly indexed. We use site:producthunt.com
// to surface launches and posts, then map them to product+maker leads.

import { searchWebMulti, type WebResult } from "./web";

export interface ProductHuntResult {
  productName: string;
  productUrl: string;
  description: string;
  makers?: string[];          // Maker names parsed from snippet if present
  category?: string;
  upvotes?: number;
  website?: string;
  snippet: string;
}

const TOPIC_REGEX = /\/topics\/([a-z0-9-]+)/i;

function parseUpvotes(snippet: string): number | undefined {
  const m = snippet.match(/(\d+)\s*\+?\s*(?:upvotes|upvote)/i);
  if (m) return parseInt(m[1], 10);
  return undefined;
}

function parseMakers(snippet: string): string[] | undefined {
  // Product Hunt snippets often say "@hunter, @maker1, @maker2" or "by Maker Name"
  const makerMatches = snippet.match(/@([a-z0-9_]+)/gi);
  if (makerMatches && makerMatches.length) {
    const unique = [...new Set(makerMatches.map((m) => m.slice(1)))].slice(0, 5);
    return unique;
  }
  const byMatch = snippet.match(/\bby\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  if (byMatch) return [byMatch[1]];
  return undefined;
}

function extractProductName(title: string): string {
  // PH page titles: "Product Name — Product Hunt" or "Product Name | Product Hunt"
  let t = title.replace(/\s*[—–|]\s*Product\s*Hunt.*$/i, "").trim();
  // Or "Product Name - Product reviews"
  t = t.replace(/\s*[-–—|].*$/i, "").trim();
  return t;
}

export async function searchProductHunt(query: string, maxResults = 25): Promise<ProductHuntResult[]> {
  const cleaned = query.replace(/\bsite:producthunt\.com\b/gi, "").replace(/"/g, "").trim();
  const phQuery = `site:producthunt.com ${cleaned}`.trim();
  const results = await searchWebMulti(phQuery, maxResults);

  const out: ProductHuntResult[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (!/producthunt\.com\//i.test(r.url)) continue;
    // We want product pages, posts, and topic hubs — skip /topics/* (browse lists)
    const topicMatch = r.url.match(TOPIC_REGEX);
    const isProduct = /producthunt\.com\/(?:posts|products)\//i.test(r.url);
    if (!isProduct && !topicMatch) continue;

    if (seen.has(r.url)) continue;
    seen.add(r.url);

    out.push({
      productName: extractProductName(r.title),
      productUrl: r.url,
      description: r.snippet,
      category: topicMatch ? topicMatch[1] : undefined,
      makers: parseMakers(r.snippet),
      upvotes: parseUpvotes(r.snippet),
      snippet: r.snippet,
    });

    if (out.length >= maxResults) break;
  }
  return out;
}
