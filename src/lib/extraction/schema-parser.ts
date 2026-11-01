// Parse schema.org JSON-LD structured data from HTML.

export function parseStructuredData(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  // Match <script type="application/ld+json"> blocks
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) {
        out.push(...parsed);
      } else if (parsed["@graph"] && Array.isArray(parsed["@graph"])) {
        out.push(...(parsed["@graph"] as Record<string, unknown>[]));
      } else {
        out.push(parsed);
      }
    } catch {
      // skip malformed JSON-LD
    }
  }
  return out;
}
