/**
 * AI (LLM) task interfaces (SPEC Section 12).
 * Tasks: query_expand, extract_contacts, classify, score, summarize,
 * write_draft, rewrite_draft.
 */

import { z } from "zod";

// Task output schemas (validated per SPEC Section 12.2 rule 4).
export const QueryExpandSchema = z.object({
  keywords: z.array(z.string()),
  osm_tags: z.record(z.string(), z.string()).optional(),
  google_types: z.array(z.string()),
});

export const ExtractContactsSchema = z.object({
  company: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
  people: z.array(
    z.object({
      name: z.string(),
      role: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      linkedin_url: z.string().optional(),
      evidence: z.string(), // must exist in page text (Section 11.3 rule 4)
    }),
  ),
});

export const ClassifySchema = z.object({
  business_type: z.string(), // must come from Taxonomy (Section 12.2 rule 5)
  industry: z.string(),      // must come from Taxonomy
  confidence: z.number().min(0).max(1),
});

export const ScoreSchema = z.object({
  score: z.number().min(0).max(100),
  reasons: z.array(z.string()).max(3),
});

export const SummarizeSchema = z.object({
  summary: z.string().max(200),
});

export const WriteDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
  personalization_facts: z.array(z.string()), // must exist in Lead fields (Section 12.2 rule 6)
});

export type TaskName =
  | "query_expand"
  | "extract_contacts"
  | "classify"
  | "score"
  | "summarize"
  | "write_draft"
  | "rewrite_draft";

export interface AITaskInput {
  task: TaskName;
  input: unknown;
}

export interface LLMProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  fallbackModel?: string;
  jsonMode: "auto" | "json_schema" | "json_object" | "none";
  temperature: number;
  maxOutputTokens: number;
  timeoutSeconds: number;
  allowPrivateNetwork: boolean;
}

export interface AITaskRoute {
  task: TaskName;
  llmProviderId: number | null;
}
