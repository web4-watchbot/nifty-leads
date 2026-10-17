/**
 * Wikidata connector (SPEC Section 9.2).
 * SPARQL search for companies by industry and country.
 * Finds property IDs by label with the wbsearchentities API (no hard-coded IDs).
 * CC0 data.
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

const SPARQL_ENDPOINT = "/sparql";
const SEARCH_ENDPOINT = "/w/api.php";

interface SearchEntityResult {
  id: string;
}

interface SparqlBinding {
  item?: { type: string; value: string };
  itemLabel?: { value: string };
  website?: { value: string };
  value?: { value: string };
  countryLabel?: { value: string };
}

async function findPropertyId(
  baseUrl: string,
  label: string,
  cfg: SourceConfig
): Promise<string | null> {
  try {
    const url = new URL(`${baseUrl}${SEARCH_ENDPOINT}`);
    url.searchParams.set("action", "wbsearchentities");
    url.searchParams.set("search", label);
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    url.searchParams.set("type", "property");
    const res = await ssrfFetch(url.href, {
      headers: { Accept: "application/json" },
      timeoutMs: 15000,
      allowPrivateNetwork: cfg.allowPrivateNetwork,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { search?: SearchEntityResult[] };
    return json.search?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

function buildSparqlQuery(
  propertyId: string | null,
  industry: string | undefined,
  country: string | undefined,
  limit: number
): string {
  const industryFilter = industry
    ? `OPTIONAL { ?item wdt:P31 ?industry . FILTER(CONTAINS(?industryLabel, "${industry}")) }`
    : "";
  const countryFilter = country
    ? `OPTIONAL { ?item wdt:P17 ?country . FILTER(CONTAINS(?countryLabel, "${country}")) }`
    : "";
  const propClause = propertyId ? `OPTIONAL { ?item wdt:${propertyId} ?value . }` : "";
  return `
    SELECT ?item ?itemLabel ?value ?website ?countryLabel WHERE {
      ?item wdt:P31 wdt:Q783794 .
      ${propClause}
      OPTIONAL { ?item wdt:P856 ?website . }
      ${industryFilter}
      ${countryFilter}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT ${limit}
  `;
}

export const WikidataConnector: SourceConnector = {
  kind: "wikidata",
  label: "Wikidata",
  canFill: [
    "company_name",
    "company_website",
    "company_linkedin_url",
    "industry",
    "location",
  ],
  supportsModes: ["company_b2b", "enrich"],
  async estimate(_q: SearchQuery, cfg: SourceConfig) {
    return { calls: 1, credits: cfg.costCreditsPerCall };
  },
  async *search(_q: SearchQuery, cfg: SourceConfig, ctx: RunContext): AsyncGenerator<RawLead> {
    if (ctx.aborted) return;

    const websiteProp = await findPropertyId(cfg.baseUrl, "official website", cfg);
    const industry = _q.industries?.[0];
    const country = _q.location?.text;
    const limit = _q.maxResults;

    const query = buildSparqlQuery(websiteProp, industry, country, limit);
    const sparqlUrl = `${cfg.baseUrl}${SPARQL_ENDPOINT}`;

    try {
      const res = await ssrfFetch(sparqlUrl, {
        method: "POST",
        headers: {
          Accept: "application/sparql-results+json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `query=${encodeURIComponent(query)}`,
        timeoutMs: 60000,
        allowPrivateNetwork: cfg.allowPrivateNetwork,
      });
      if (!res.ok) return;
      const json = (await res.json()) as {
        results?: { bindings?: SparqlBinding[] };
      };
      const bindings = json.results?.bindings ?? [];

      for (const binding of bindings) {
        if (ctx.aborted) return;

        const fields: Partial<Record<LeadField, string>> = {};
        const extended: Record<string, unknown> = {};

        if (binding.itemLabel?.value && _q.wantedFields.includes("company_name")) {
          fields.company_name = binding.itemLabel.value;
        }
        if (binding.website?.value && _q.wantedFields.includes("company_website")) {
          fields.company_website = binding.website.value;
          extended.company_website = binding.website.value;
        }
        if (binding.value?.value) {
          const value = binding.value.value;
          if (
            value.includes("linkedin.com/company/") &&
            _q.wantedFields.includes("company_linkedin_url")
          ) {
            fields.company_linkedin_url = value;
          }
          extended.wikidata_value = value;
        }
        if (industry && _q.wantedFields.includes("industry")) {
          fields.industry = industry;
        }
        if (binding.countryLabel?.value && _q.wantedFields.includes("location")) {
          fields.location = binding.countryLabel.value;
        }
        if (binding.item?.value) {
          const qid = binding.item.value.split("/entity/")[1];
          if (qid) extended.wikidata_qid = qid;
        }

        if (Object.keys(fields).length > 0 || Object.keys(extended).length > 0) {
          yield {
            fields,
            extended,
            sourceKind: "wikidata",
            sourceRecordId: String(extended.wikidata_qid ?? ""),
            sourceUrl: sparqlUrl,
            fetchedAt: new Date().toISOString(),
          };
        }
      }
    } catch {
      return;
    }
  },
  async test(cfg: SourceConfig) {
    try {
      const prop = await findPropertyId(cfg.baseUrl, "official website", cfg);
      return {
        ok: !!prop,
        sample: [],
        error: prop ? undefined : "Could not resolve property ID",
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
