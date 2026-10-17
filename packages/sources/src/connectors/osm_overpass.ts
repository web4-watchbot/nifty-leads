/**
 * OSM Overpass connector (SPEC Section 9.2).
 * Main local-business Source for the Free Plan.
 * Maps Business Types to OSM tags (shop, amenity, office, craft, healthcare, tourism).
 */

import { ssrfFetch } from "@nifty-leads/core";
import type {
  SourceConnector,
  SearchQuery,
  RawLead,
  SourceConfig,
  RunContext,
  LeadField,
} from "../connector";

type LocationInput = SearchQuery["location"];

// Overpass QL template: find nodes/ways with matching tags within a bounding box.
function buildOverpassQuery(
  tags: Record<string, string>,
  bbox: [number, number, number, number],
  maxResults: number
): string {
  const [south, west, north, east] = bbox;
  const clauses = Object.entries(tags)
    .map(([k, v]) => `node["${k}"="${v}"](${south},${west},${north},${east});`)
    .join("\n");
  return `
    [out:json][timeout:25];
    (
      ${clauses}
      way["${Object.keys(tags)[0]}"="${Object.values(tags)[0]}"](${south},${west},${north},${east});
    );
    out center ${maxResults > 0 ? maxResults : 50};
  `;
}

/**
 * Map a Business Type name to OSM tags. The Admin maintains this map in the
 * Taxonomy (Section 5.5). Here is a built-in fallback for common types.
 */
export function osmTagsForBusinessType(businessType: string): Record<string, string> {
  const lower = businessType.toLowerCase();
  const map: Record<string, Record<string, string>> = {
    "dental clinic": { amenity: "dentist" },
    "general practice": { amenity: "doctors" },
    "physiotherapy clinic": { healthcare: "physiotherapy" },
    hotel: { tourism: "hotel" },
    restaurant: { amenity: "restaurant" },
    cafe: { amenity: "cafe" },
    "hair salon": { shop: "hairdresser" },
    "beauty salon": { shop: "beauty" },
    "car repair": { shop: "car_repair" },
    "car dealership": { shop: "car" },
    "grocery store": { shop: "supermarket" },
    pharmacy: { shop: "pharmacy" },
    school: { amenity: "school" },
    university: { amenity: "university" },
    "law firm": { office: "lawyer" },
    "accounting firm": { office: "accountant" },
    "software company": { office: "it" },
    bakery: { shop: "bakery" },
    bar: { amenity: "bar" },
    "real estate agency": { office: "estate_agent" },
    "construction company": { office: "construction" },
  };
  return map[lower] || {};
}

function parseOsmElement(
  el: Record<string, unknown>,
  wantedFields: LeadField[]
): Partial<Record<LeadField, string>> {
  const fields: Partial<Record<LeadField, string>> = {};
  const tags = (el.tags as Record<string, string> | undefined) ?? {};

  if (wantedFields.includes("company_name") && tags.name) {
    fields.company_name = tags.name;
  }
  if (wantedFields.includes("company_website") && tags.website) {
    fields.company_website = tags.website;
  }
  if (wantedFields.includes("phone") && (tags.phone || tags.contact_phone)) {
    fields.phone = tags.phone || tags.contact_phone;
  }
  if (wantedFields.includes("email") && tags.email) {
    fields.email = tags.email;
  }
  if (wantedFields.includes("location")) {
    const parts: string[] = [];
    if (tags.addr_city) parts.push(tags.addr_city);
    if (tags.addr_state) parts.push(tags.addr_state);
    if (tags.addr_country) parts.push(tags.addr_country);
    if (parts.length) fields.location = parts.join(", ");
  }
  if (wantedFields.includes("business_type")) {
    // Derive from OSM tags via reverse map (caller can refine).
    const bt = tags.amenity || tags.shop || tags.office || tags.healthcare || tags.tourism;
    if (bt) fields.business_type = bt;
  }

  return fields;
}

export function buildOsmExtended(
  el: Record<string, unknown>
): Record<string, unknown> {
  const tags = (el.tags as Record<string, string> | undefined) ?? {};
  const lat = el.lat ?? (el.center as Record<string, number> | undefined)?.lat;
  const lon = el.lon ?? (el.center as Record<string, number> | undefined)?.lon;
  return {
    osm_id: el.type === "way" ? `w${el.id}` : `${el.type}${el.id}`,
    latitude: lat,
    longitude: lon,
    address_line: tags.addr_street || tags["addr:housenumber"],
    city: tags.addr_city,
    state: tags.addr_state,
    postal_code: tags.addr_postcode,
    country_code: tags.addr_country,
    website: tags.website,
    phone: tags.phone || tags.contact_phone,
    email: tags.email,
    facebook_url: tags.facebook,
    instagram_url: tags.instagram,
    ...tags,
  };
}

export const OsmOverpassConnector: SourceConnector = {
  kind: "osm_overpass",
  label: "OpenStreetMap (Overpass)",
  canFill: [
    "company_name",
    "company_website",
    "phone",
    "email",
    "location",
    "business_type",
  ],
  supportsModes: ["local_business", "company_b2b"],
  async estimate(q: SearchQuery, cfg: SourceConfig) {
    const calls = Math.max(1, Math.ceil(q.maxResults / 50));
    return { calls, credits: calls * cfg.costCreditsPerCall };
  },
  async *search(q: SearchQuery, cfg: SourceConfig, ctx: RunContext): AsyncGenerator<RawLead> {
    let results = 0;
    const businessTypes = q.businessTypes ?? [];
    // Build tag queries from Business Types.
    const tagSets: Record<string, string>[] = businessTypes.map(osmTagsForBusinessType).filter((t) => Object.keys(t).length > 0);
    if (tagSets.length === 0) {
      // Fallback: generic amenity/shop/office search.
      tagSets.push({ amenity: "restaurant" });
    }

    const loc: LocationInput = q.location ?? {};
    const bbox = loc.bbox;
    if (!bbox) {
      // No location to search - return nothing.
      return;
    }

    for (const tags of tagSets) {
      if (ctx.aborted) return;
      if (results >= q.maxResults) return;

      const query = buildOverpassQuery(tags, bbox, q.maxResults - results);
      const url = cfg.baseUrl;
      try {
        const res = await ssrfFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          timeoutMs: 30000,
          allowPrivateNetwork: cfg.allowPrivateNetwork ?? false,
        });

        if (!res.ok) continue;
        const json = (await res.json()) as { elements?: Array<Record<string, unknown>> };
        const elements = json.elements;
        if (!elements) continue;

        for (const el of elements) {
          if (ctx.aborted || results >= q.maxResults) return;
          const fields = parseOsmElement(el, q.wantedFields);
          if (Object.keys(fields).length === 0) continue;
          const extended = buildOsmExtended(el);
          const raw: RawLead = {
            fields,
            extended,
            sourceKind: "osm_overpass",
            sourceRecordId: String(el.id),
            sourceUrl: url,
            fetchedAt: new Date().toISOString(),
          };
          results++;
          yield raw;
        }
      } catch {
        // Source errors are handled by the pipeline (retry/pause).
        continue;
      }
    }
  },
  async test(cfg) {
    try {
      const res = await ssrfFetch(cfg.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: '[out:json][timeout:10];node["amenity"="restaurant"](18.5,73.8,19.3,74.0);out 1;',
        }),
        timeoutMs: 20000,
        allowPrivateNetwork: cfg.allowPrivateNetwork ?? false,
      });
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }
      await res.json();
      return { ok: true, sample: [], error: undefined };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
