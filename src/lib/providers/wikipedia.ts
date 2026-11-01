// Free Wikipedia/DBpedia search — great for finding companies, organisations,
// educational institutions, and notable people with publicly disclosed info.

export interface WikiResult {
  title: string;
  description: string;
  url: string;
  extract: string;
  thumbnail?: string;
}

export async function searchWikipedia(query: string, maxResults = 10): Promise<WikiResult[]> {
  const cleaned = query.replace(/^site:\S+\s*/i, "").replace(/["'"]/g, "").trim();
  if (!cleaned) return [];
  // Search English Wikipedia
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleaned)}&srlimit=${maxResults}&format=json&origin=*`;
  const res = await fetch(searchUrl, {
    headers: { "User-Agent": "NiftyLeadFinder/1.0 (https://niftytechfinds.com)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Wikipedia returned ${res.status}`);
  const data = (await res.json()) as { query?: { search: Array<{ title: string; snippet: string; pageid: number }> } };
  const out: WikiResult[] = [];
  for (const item of data.query?.search || []) {
    const pageUrl = `https://en.wikipedia.org/?curid=${item.pageid}`;
    const snippet = item.snippet.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    out.push({
      title: item.title,
      description: snippet.slice(0, 200),
      url: pageUrl,
      extract: snippet,
    });
  }
  return out;
}
