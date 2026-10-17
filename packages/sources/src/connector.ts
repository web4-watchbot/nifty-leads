/**
 * Source Connector interface (SPEC Section 9.1).
 * Each Source Connector implements this interface. Connectors live in
 * packages/sources/<kind>/.
 */

import type { SSRFHttpOptions } from "@nifty-leads/core";

export type LeadField =
  | "company_name" | "individual_name" | "role"
  | "person_linkedin_url" | "company_linkedin_url" | "company_website"
  | "phone" | "email" | "location" | "business_type" | "industry";

export interface SearchQuery {
  mode: "local_business" | "company_b2b" | "people_at_company" | "enrich";
  keywords: string[];
  businessTypes: string[];
  industries: string[];
  roles: string[];
  location?: {
    text?: string;
    countryCode?: string;
    bbox?: [number, number, number, number];
    center?: { lat: number; lng: number };
    radiusKm?: number;
  };
  wantedFields: LeadField[];
  maxResults: number;
  seedLeads?: RawLead[];
}

export interface RawLead {
  fields: Partial<Record<LeadField, string>>;
  extended: Record<string, unknown>;
  sourceKind: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  fetchedAt: string;
}

export interface SourceConfig {
  kind: string;
  baseUrl: string;
  authType: "none" | "header" | "query" | "bearer" | "basic";
  apiKey?: string;
  apiSecret?: string;
  extraHeaders?: Record<string, string>;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  reliability: number;
  canFill: LeadField[];
  allowedPlans: string[];
  httpOptions?: SSRFHttpOptions;
}

export interface RunContext {
  runId: number;
  userId: number;
  aborted: boolean;
}

export interface SourceConnector {
  kind: string;
  label: string;
  canFill: LeadField[];
  supportsModes: SearchQuery["mode"][];
  estimate(q: SearchQuery, cfg: SourceConfig): Promise<{ calls: number; credits: number }>;
  search(q: SearchQuery, cfg: SourceConfig, ctx: RunContext): AsyncIterable<RawLead>;
  test(cfg: SourceConfig): Promise<{ ok: boolean; sample?: RawLead[]; error?: string }>;
}
