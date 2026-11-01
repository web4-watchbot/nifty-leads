// Free Hacker News (Algolia) search — useful for finding tech founders,
// indie hackers, and discussion threads about companies/products.

export interface HNResult {
  title: string;
  url: string;
  hnUrl: string;
  points: number;
  author: string;
  createdAt: string;
  storyText?: string;
}

export async function searchHackerNews(query: string, maxResults = 15): Promise<HNResult[]> {
  const cleaned = query.replace(/^site:\S+\s*/i, "").replace(/["'"]/g, "").trim();
  if (!cleaned) return [];
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(cleaned)}&tags=story&hitsPerPage=${maxResults}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "NiftyLeadFinder/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HN returned ${res.status}`);
  const data = (await res.json()) as { hits: Array<{ title?: string; url?: string; objectID: string; points: number; author: string; created_at: string; story_text?: string }> };
  const out: HNResult[] = [];
  for (const hit of data.hits || []) {
    if (!hit.title) continue;
    out.push({
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      hnUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      points: hit.points || 0,
      author: hit.author,
      createdAt: hit.created_at,
      storyText: hit.story_text ? hit.story_text.replace(/<[^>]*>/g, "").slice(0, 300) : undefined,
    });
  }
  return out;
}
