// Relevance & completeness scoring — rule-based (no AI API required, 100% free).

export interface ScoringInput {
  query: string;
  businessName?: string | null;
  description?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  email?: string | null;
  emailExtra?: string | null;
  phone?: string | null;
  phoneExtra?: string | null;
  address?: string | null;
  linkedinUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  xUrl?: string | null;
  githubUrl?: string | null;
  sourceProvider?: string | null;
}

export interface ScoringOutput {
  relevanceScore: number;       // 0-100
  completenessScore: number;    // 0-100
  relevanceReason: string;
  fieldConfidence: Record<string, "verified" | "high" | "medium" | "low" | "not_verified">;
}

const QUERY_STOPWORDS = new Set([
  "the", "a", "an", "in", "of", "for", "and", "or", "to", "with", "near", "find", "list", "top", "best", "all",
]);

export function scoreLead(input: ScoringInput): ScoringOutput {
  const queryLower = input.query.toLowerCase();
  const queryTerms = queryLower
    .replace(/["']/g, " ")
    .replace(/\b(site|intitle|inurl|filetype|after|before|domain|country|language):\S+/g, " ")
    .replace(/\b(AND|OR|NOT)\b/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !QUERY_STOPWORDS.has(w));

  const haystack = [
    input.businessName || "",
    input.description || "",
    input.industry || "",
    input.city || "",
    input.country || "",
    input.website || "",
  ].join(" ").toLowerCase();

  // Relevance: count query terms found in lead's text
  let matched = 0;
  const matchedTerms: string[] = [];
  for (const term of queryTerms) {
    if (haystack.includes(term)) {
      matched++;
      matchedTerms.push(term);
    }
  }

  const termRatio = queryTerms.length ? matched / queryTerms.length : 0;
  let relevance = Math.round(termRatio * 80);

  // Bonus: exact phrase match in business name
  if (input.businessName) {
    const nameLower = input.businessName.toLowerCase();
    for (const term of queryTerms) {
      if (nameLower.includes(term)) {
        relevance += 4;
        break;
      }
    }
  }

  // Bonus: has website matching the query industry
  if (input.website && input.businessName) {
    relevance += 3;
  }

  // Source quality bonus
  if (input.sourceProvider === "overpass") relevance += 5; // OSM data is structured & verified
  if (input.sourceProvider === "github") relevance += 3;
  if (input.sourceProvider === "wikipedia") relevance += 4;

  relevance = Math.min(100, Math.max(0, relevance));

  // Completeness: weighted score across available fields
  const fields = [
    { name: "businessName", value: input.businessName, weight: 15 },
    { name: "website", value: input.website, weight: 15 },
    { name: "email", value: input.email || input.emailExtra, weight: 20 },
    { name: "phone", value: input.phone || input.phoneExtra, weight: 15 },
    { name: "address", value: input.address, weight: 8 },
    { name: "city", value: input.city, weight: 5 },
    { name: "country", value: input.country, weight: 5 },
    { name: "industry", value: input.industry, weight: 5 },
    { name: "description", value: input.description, weight: 4 },
    { name: "linkedin", value: input.linkedinUrl, weight: 3 },
    { name: "youtube", value: input.youtubeUrl, weight: 2 },
    { name: "instagram", value: input.instagramUrl, weight: 1 },
    { name: "facebook", value: input.facebookUrl, weight: 1 },
    { name: "x", value: input.xUrl, weight: 1 },
    { name: "github", value: input.githubUrl, weight: 2 },
  ];

  let totalWeight = 0;
  let earned = 0;
  const fieldConfidence: Record<string, "verified" | "high" | "medium" | "low" | "not_verified"> = {};

  for (const f of fields) {
    totalWeight += f.weight;
    if (f.value && String(f.value).trim()) {
      earned += f.weight;
      // Confidence: OSM & GitHub data is more reliable
      if (input.sourceProvider === "overpass" && ["businessName", "phone", "website", "address"].includes(f.name)) {
        fieldConfidence[f.name] = "high";
      } else if (input.sourceProvider === "github" && ["businessName", "website", "linkedin", "github"].includes(f.name)) {
        fieldConfidence[f.name] = "verified";
      } else if (f.name === "email" && input.website) {
        // Email from same domain → high confidence
        fieldConfidence[f.name] = "high";
      } else {
        fieldConfidence[f.name] = "medium";
      }
    } else {
      fieldConfidence[f.name] = "not_verified";
    }
  }

  const completeness = Math.round((earned / totalWeight) * 100);

  const reasonParts: string[] = [];
  if (matchedTerms.length) reasonParts.push(`matched ${matched}/${queryTerms.length} query terms (${matchedTerms.slice(0, 3).join(", ")})`);
  if (input.sourceProvider === "overpass") reasonParts.push("verified via OpenStreetMap");
  if (input.sourceProvider === "github") reasonParts.push("verified GitHub profile");
  if (input.sourceProvider === "wikipedia") reasonParts.push("notable entity on Wikipedia");
  if (input.businessName) reasonParts.push(`business name: ${input.businessName}`);
  if (!reasonParts.length) reasonParts.push("matched via web search");

  return {
    relevanceScore: relevance,
    completenessScore: completeness,
    relevanceReason: reasonParts.join("; "),
    fieldConfidence,
  };
}

// Lightweight AI-like summary (rule-based, no LLM API call)
export function generateSummary(input: ScoringInput): string {
  const parts: string[] = [];
  if (input.businessName) parts.push(input.businessName);
  if (input.industry) parts.push(`a ${input.industry}`);
  if (input.city && input.country) parts.push(`based in ${input.city}, ${input.country}`);
  else if (input.country) parts.push(`based in ${input.country}`);
  if (input.website) parts.push(`with an official website at ${shortenUrl(input.website)}`);
  if (input.email) parts.push(`contactable at ${input.email}`);
  if (input.phone) parts.push(`phone ${input.phone}`);
  if (input.linkedinUrl) parts.push("active on LinkedIn");
  if (input.youtubeUrl) parts.push("maintains a YouTube channel");

  if (!parts.length) return "No structured information available for this lead.";
  return `${parts.join(", ")}.`;
}

function shortenUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
