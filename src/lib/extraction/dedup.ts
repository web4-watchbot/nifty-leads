// Deduplication engine — identify probable duplicate leads using multiple signals.

export interface LeadFingerprint {
  id: string;
  businessName?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  sourceProvider?: string | null;
  sourceUrl?: string | null;
}

export interface DuplicateMatch {
  aId: string;
  bId: string;
  score: number; // 0-1 confidence
  reasons: string[];
}

const STOPWORDS = new Set(["the", "a", "an", "ltd", "llc", "inc", "co", "company", "corp", "corporation", "limited", "pvt", "pvt.", "private", "group", "global"]);

export function normalizeDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeBusinessName(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .sort()
    .join(" ");
}

export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").slice(-10);
}

export function jaroWinkler(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const matchDistance = Math.max(Math.floor(Math.max(a.length, b.length) / 2) - 1, 0);
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  t = t / 2;
  const jaro = (matches / a.length + matches / b.length + (matches - t) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(a.length, b.length, 4); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

export function findDuplicates(leads: LeadFingerprint[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  for (let i = 0; i < leads.length; i++) {
    for (let j = i + 1; j < leads.length; j++) {
      const a = leads[i];
      const b = leads[j];
      let score = 0;
      const reasons: string[] = [];

      // Same website domain → very strong signal
      const aDom = normalizeDomain(a.website);
      const bDom = normalizeDomain(b.website);
      if (aDom && bDom && aDom === bDom) {
        score += 0.7;
        reasons.push(`same website domain (${aDom})`);
      }

      // Same business name (fuzzy)
      const aName = normalizeBusinessName(a.businessName);
      const bName = normalizeBusinessName(b.businessName);
      if (aName && bName) {
        const sim = jaroWinkler(aName, bName);
        if (sim > 0.92) {
          score += 0.5;
          reasons.push(`similar business name (${(sim * 100).toFixed(0)}%)`);
        } else if (sim > 0.8) {
          score += 0.25;
          reasons.push(`similar business name (${(sim * 100).toFixed(0)}%)`);
        }
      }

      // Same phone
      const aPhone = normalizePhone(a.phone);
      const bPhone = normalizePhone(b.phone);
      if (aPhone && bPhone && aPhone === bPhone) {
        score += 0.6;
        reasons.push("same phone number");
      }

      // Same email
      if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
        score += 0.7;
        reasons.push("same email");
      }

      if (score >= 0.6) {
        matches.push({ aId: a.id, bId: b.id, score: Math.min(1, score), reasons });
      }
    }
  }
  return matches.sort((x, y) => y.score - x.score);
}

// Merge duplicates — keep both source URLs, prefer stronger evidence
export function pickWinner<T extends { completenessScore?: number; relevanceScore?: number; createdAt?: Date | string }>(a: T, b: T): "a" | "b" {
  const aScore = (a.completenessScore || 0) + (a.relevanceScore || 0) * 0.5;
  const bScore = (b.completenessScore || 0) + (b.relevanceScore || 0) * 0.5;
  if (aScore !== bScore) return aScore > bScore ? "a" : "b";
  // Tie-break: newer wins
  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return aTime >= bTime ? "a" : "b";
}
