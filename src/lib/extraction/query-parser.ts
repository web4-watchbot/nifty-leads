// Parse a search query that may include Google-style operators into a structured form.

export interface ParsedQuery {
  raw: string;
  text: string;          // Plain text portion
  exactPhrases: string[]; // Quoted phrases
  excluded: string[];    // Words with minus prefix
  site?: string;         // site: operator
  intitle?: string;      // intitle: operator
  inurl?: string;        // inurl: operator
  filetype?: string;     // filetype: operator
  after?: string;        // after:YYYY-MM-DD
  before?: string;       // before:YYYY-MM-DD
  orGroups: string[][];  // Groups of OR-separated keywords
  domain?: string;       // Domain restriction
  language?: string;
  country?: string;
  hasEmail: boolean;     // user mentioned "email"
  hasPhone: boolean;
  hasContact: boolean;
}

export function parseQuery(raw: string): ParsedQuery {
  const q = raw.trim();
  const exactPhrases: string[] = [];
  const excluded: string[] = [];
  let site: string | undefined;
  let intitle: string | undefined;
  let inurl: string | undefined;
  let filetype: string | undefined;
  let after: string | undefined;
  let before: string | undefined;
  let domain: string | undefined;
  let language: string | undefined;
  let country: string | undefined;

  // Extract exact phrases first
  let working = q.replace(/"([^"]+)"/g, (_, p1: string) => {
    exactPhrases.push(p1);
    return " ";
  });

  // site: operator
  working = working.replace(/\bsite:(\S+)/gi, (_, p1: string) => { site = p1.toLowerCase(); return " "; });
  // intitle: operator
  working = working.replace(/\bintitle:(\S+)/gi, (_, p1: string) => { intitle = p1; return " "; });
  // inurl: operator
  working = working.replace(/\binurl:(\S+)/gi, (_, p1: string) => { inurl = p1; return " "; });
  // filetype: operator
  working = working.replace(/\bfiletype:(\S+)/gi, (_, p1: string) => { filetype = p1.toLowerCase(); return " "; });
  // after: / before:
  working = working.replace(/\bafter:(\S+)/gi, (_, p1: string) => { after = p1; return " "; });
  working = working.replace(/\bbefore:(\S+)/gi, (_, p1: string) => { before = p1; return " "; });
  // domain:
  working = working.replace(/\bdomain:(\S+)/gi, (_, p1: string) => { domain = p1.toLowerCase(); return " "; });
  // language:
  working = working.replace(/\blanguage:(\S+)/gi, (_, p1: string) => { language = p1.toLowerCase(); return " "; });
  // country:
  working = working.replace(/\bcountry:(\S+)/gi, (_, p1: string) => { country = p1.toLowerCase(); return " "; });

  // Excluded keywords (-word)
  working = working.replace(/\s-(\w+)/g, (_, p1: string) => { excluded.push(p1); return " "; });

  // Remove boolean AND/OR (case-insensitive) — keep words
  working = working.replace(/\b(AND|OR|NOT)\b/gi, " ");

  const text = working.replace(/\s+/g, " ").trim();

  // OR groups: split by OR (case-sensitive in our parsed string now removed, so we re-parse the raw)
  const orGroups: string[][] = [];
  const orSplit = q.replace(/"([^"]+)"/g, " ").split(/\s+OR\s+/i);
  if (orSplit.length > 1) {
    for (const part of orSplit) {
      const words = part.trim().split(/\s+/).filter(Boolean);
      if (words.length) orGroups.push(words);
    }
  }

  const lower = q.toLowerCase();
  const hasEmail = /\bemail\b|\bcontact email\b|@/i.test(q) && !q.includes("@youtube");
  const hasPhone = /\bphone\b|\btelephone\b|\bmobile\b|\bcontact number\b/i.test(q);
  const hasContact = hasEmail || hasPhone || /\bcontact\b/i.test(q);

  return {
    raw: q,
    text,
    exactPhrases,
    excluded,
    site,
    intitle,
    inurl,
    filetype,
    after,
    before,
    orGroups,
    domain,
    language,
    country,
    hasEmail,
    hasPhone,
    hasContact,
  };
}

// Generate source-specific query variations
export function buildProviderQueries(parsed: ParsedQuery): {
  web: string;
  youtube: string;
  github: string;
  overpass: string;
  wikipedia: string;
  hn: string;
  linkedin: string;
  crunchbase: string;
  producthunt: string;
  social: string;
} {
  const phrases = parsed.exactPhrases.length ? parsed.exactPhrases.map((p) => `"${p}"`).join(" ") : parsed.text;
  const negExcluded = parsed.excluded.map((e) => `-${e}`).join(" ");

  // LinkedIn already includes site:linkedin.com/in inside the provider, so here
  // we just pass the plain query text (the provider will wrap it).
  const linkedinBase = parsed.exactPhrases.length ? parsed.exactPhrases.join(" ") : parsed.text;
  // Crunchbase & Product Hunt likewise wrap with site: themselves.
  const cbBase = parsed.exactPhrases.length ? parsed.exactPhrases.join(" ") : parsed.text;
  const phBase = parsed.exactPhrases.length ? parsed.exactPhrases.join(" ") : parsed.text;
  const socialBase = parsed.exactPhrases.length ? parsed.exactPhrases.join(" ") : parsed.text;

  return {
    web: [phrases, parsed.site ? `site:${parsed.site}` : "", parsed.intitle ? `intitle:${parsed.intitle}` : "", parsed.inurl ? `inurl:${parsed.inurl}` : "", negExcluded].filter(Boolean).join(" "),
    youtube: parsed.site === "youtube.com" || !parsed.site
      ? [parsed.exactPhrases[0] || parsed.text, "site:youtube.com"].filter(Boolean).join(" ")
      : "",
    github: parsed.text || parsed.exactPhrases.join(" "),
    overpass: parsed.text || parsed.exactPhrases.join(" "),
    wikipedia: parsed.exactPhrases[0] || parsed.text,
    hn: parsed.text || parsed.exactPhrases.join(" "),
    linkedin: linkedinBase,
    crunchbase: cbBase,
    producthunt: phBase,
    social: socialBase,
  };
}

// AI-like query expansion — generates multiple relevant search variations.
// Uses heuristic templates (no external AI API needed → 100% free).
export function expandQuery(raw: string, opts?: { location?: string; industry?: string }): string[] {
  const parsed = parseQuery(raw);
  const core = parsed.exactPhrases[0] || parsed.text || raw;
  const loc = opts?.location && opts.location !== "worldwide" ? opts.location : "";
  const industry = opts?.industry || "";

  const variations: string[] = [
    raw,
    `${core} ${loc}`.trim(),
    `${core} agency ${loc}`.trim(),
    `${core} company ${loc}`.trim(),
    `${core} contact email ${loc}`.trim(),
    `${core} business enquiries ${loc}`.trim(),
  ];

  if (industry) {
    variations.push(`${industry} ${core} ${loc}`.trim());
    variations.push(`"${industry}" "${core}" contact ${loc}`.trim());
  }

  // Add city-specific variations for big markets
  if (loc && /\busa|united states|america\b/i.test(loc)) {
    variations.push(`${core} New York`);
    variations.push(`${core} Los Angeles`);
    variations.push(`${core} Chicago`);
    variations.push(`${core} San Francisco`);
  }
  if (loc && /\bindia\b/i.test(loc)) {
    variations.push(`${core} Mumbai`);
    variations.push(`${core} Delhi`);
    variations.push(`${core} Bangalore`);
  }
  if (loc && /\baustralia\b/i.test(loc)) {
    variations.push(`${core} Sydney`);
    variations.push(`${core} Melbourne`);
  }
  if (loc && /\buk|united kingdom|britain\b/i.test(loc)) {
    variations.push(`${core} London`);
    variations.push(`${core} Manchester`);
  }

  // Deduplicate & cap
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variations) {
    const key = v.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= 10) break;
  }
  return out;
}
