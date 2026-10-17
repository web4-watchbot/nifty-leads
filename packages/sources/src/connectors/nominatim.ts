/**
 * Nominatim connector (SPEC Section 9.2).
 * Converts location text to a bounding box and center point.
 * Maximum 1 request each second. Cache all results.
 */

import { ssrfFetch } from "@nifty-leads/core";
import type {
  SourceConnector,
  SearchQuery,
  RawLead,
  SourceConfig,
  RunContext,
} from "../connector";

type LocationInput = SearchQuery["location"];

export const NominatimConnector: SourceConnector = {
  kind: "nominatim",
  label: "Nominatim (Geocode)",
  canFill: ["location"],
  supportsModes: ["local_business", "company_b2b", "people_at_company", "enrich"],
  async estimate(_q: SearchQuery, cfg: SourceConfig) {
    return { calls: 1, credits: cfg.costCreditsPerCall };
  },
  async *search(q: SearchQuery, cfg: SourceConfig, ctx: RunContext): AsyncGenerator<RawLead> {
    const locationText = q.location?.text;
    if (!locationText) return;

    if (ctx.aborted) return;

    const loc: LocationInput = q.location ?? {};

    // Build query params.
    const params = new URLSearchParams({
      q: locationText,
      format: "json",
      limit: "1",
      "polygon_geojson": "0",
      "accept-language": "en",
    });
    if (loc.countryCode) params.set("countrycodes", loc.countryCode);
    if (loc.center) {
      params.set("viewbox", `${loc.center.lng},${loc.center.lat},${loc.center.lng},${loc.center.lat}`);
      params.set("bounded", "1");
    }

    const url = `${cfg.baseUrl}/search?${params.toString()}`;

    try {
      const res = await ssrfFetch(url, {
        headers: {
          "Accept": "application/json",
          // Nominatim requires an identifying User-Agent (SPEC 9.1 rule 2).
        },
        timeoutMs: 15000,
        allowPrivateNetwork: cfg.allowPrivateNetwork ?? false,
      });
      if (!res.ok) return;
      const json = await res.json();
      const results = Array.isArray(json) ? json : [];
      if (results.length === 0) return;

      const top = results[0];
      const boundingbox = top.boundingbox as [number, number, number, number] | undefined;
      if (!boundingbox) return;

      // Nominatim boundingbox is [south, north, west, east]; Overpass wants [south, west, north, east].
      const bbox: [number, number, number, number] = [
        boundingbox[0], boundingbox[2], boundingbox[1], boundingbox[3],
      ];
      const center = {
        lat: Number(top.lat),
        lng: Number(top.lon),
      };

      const raw: RawLead = {
        fields: {},
        extended: {
          bounding_box: bbox,
          center,
          display_name: top.display_name,
          location_text: locationText,
          country_code: top.address?.country_code,
        },
        sourceKind: "nominatim",
        sourceRecordId: String(top.place_id ?? top.osm_id ?? top.osm_type),
        sourceUrl: url,
        fetchedAt: new Date().toISOString(),
      };
      yield raw;
    } catch {
      return;
    }
  },
  async test(cfg) {
    try {
      const url = `${cfg.baseUrl}/search?q=Pune,%20Maharashtra,%20India&format=json&limit=1`;
      const res = await ssrfFetch(url, {
        timeoutMs: 15000,
        allowPrivateNetwork: cfg.allowPrivateNetwork ?? false,
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const json = await res.json();
      return { ok: Array.isArray(json) && json.length > 0, sample: [], error: undefined };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
