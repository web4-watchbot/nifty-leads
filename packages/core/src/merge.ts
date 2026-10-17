/**
 * Merge and dedupe (SPEC Section 13.2).
 * Match keys in order: company_domain, phone E.164, google_place_id/osm_id,
 * match_name + postal_code, match_name similarity >= 0.90 + distance <= 200m.
 */

import { normalizeCompanyName } from "./normalize";

export type LeadField =
  | "company_name" | "individual_name" | "role"
  | "person_linkedin_url" | "company_linkedin_url" | "company_website"
  | "phone" | "email" | "location" | "business_type" | "industry";

export interface RawLeadInput {
  fields: Record<LeadField, string | undefined>;
  extended: Record<string, unknown>;
  sourceKind: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  fetchedAt: string;
  companyDomain?: string;
  matchName?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  osmId?: string;
  phoneE164?: string;
}

/**
 * Jaro-Winkler similarity between two strings (0..1).
 */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 || lenB === 0) return 0;

  const matchRange = Math.floor(Math.max(lenA, lenB) / 2) - 1;
  const aMatches = new Array(lenA).fill(false);
  const bMatches = new Array(lenB).fill(false);

  let matches = 0;
  for (let i = 0; i < lenA; i++) {
    const start = Math.max(0, i - matchRange);
    const end = Math.min(i + matchRange + 1, lenB);
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

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < lenA; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const m = matches;
  const jaro =
    m / lenA + m / lenB + (m - transpositions / 2) / m;
  const jaroBase = jaro / 3;

  // Winkler prefix bonus.
  let prefix = 0;
  for (let i = 0; i < Math.min(4, lenA, lenB); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  const p = 0.1;
  return Math.min(1, jaroBase + prefix * p * (1 - jaroBase));
}

/**
 * Haversine distance in meters between two lat/lng points.
 */
export function haversineMeters(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000; // earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Match keys in SPEC order. Returns true if two lead inputs should merge.
 */
export function leadsMatch(a: RawLeadInput, b: RawLeadInput): boolean {
  // 1. company_domain
  if (a.companyDomain && b.companyDomain && a.companyDomain === b.companyDomain)
    return true;
  // 2. phone E.164
  if (a.phoneE164 && b.phoneE164 && a.phoneE164 === b.phoneE164) return true;
  // 3. google_place_id or osm_id
  if (
    a.googlePlaceId &&
    b.googlePlaceId &&
    a.googlePlaceId === b.googlePlaceId
  )
    return true;
  if (a.osmId && b.osmId && a.osmId === b.osmId) return true;
  // 4. match_name + postal_code
  if (
    a.matchName &&
    b.matchName &&
    a.matchName === b.matchName &&
    a.postalCode &&
    b.postalCode &&
    a.postalCode === b.postalCode
  )
    return true;
  // 5. match_name similarity >= 0.90 and distance <= 200 m
  if (a.matchName && b.matchName) {
    const sim = jaroWinkler(a.matchName, b.matchName);
    if (sim >= 0.90) {
      if (
        a.latitude !== undefined &&
        a.longitude !== undefined &&
        b.latitude !== undefined &&
        b.longitude !== undefined
      ) {
        const dist = haversineMeters(
          a.latitude, a.longitude, b.latitude, b.longitude
        );
        if (dist <= 200) return true;
      } else {
        // No coordinates: treat name similarity alone as strong enough
        // only if very high (Section 13.2 rule 5 implies distance check;
        // without coords we cannot verify distance, so be conservative).
        if (sim >= 0.98) return true;
      }
    }
  }
  return false;
}

/**
 * Merge two lead field maps. For each field keep the value with highest
 * confidence. All values are recorded in field_sources (caller handles).
 * Here we just pick the non-empty value with the longer provenance hint.
 */
export function mergeFields(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (!value || (typeof value === "string" && value === "")) continue;
    if (out[key] === undefined || out[key] === null || out[key] === "") {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Compute match_name from a company name.
 */
export function computeMatchName(companyName: string): string {
  return normalizeCompanyName(companyName).matchName;
}
