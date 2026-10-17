/**
 * Database schema (Drizzle ORM, PostgreSQL).
 * Based on SPEC Section 20.3 and related sections.
 * Phase 0: foundation tables + seed data.
 */

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  unique,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Users, sessions, roles (Better Auth stores sessions; we mirror the user here)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  imageUrl: text("image_url"),
  emailVerified: timestamp("email_verified"),
  password: text("password"),
  role: text("role").notNull().default("user"), // "admin" | "user"
  planSource: text("plan_source").notNull().default("internal"), // "internal" | "wordpress"
  wordpressUserId: text("wordpress_user_id"), // Section 16 SSO
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Better Auth tables (used by better-auth/adapters/drizzle).
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  // Nullable: better-auth never writes `type` (schema check warns if NOT NULL).
  type: text("type"),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(), // required by better-auth
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Plans (Section 7.1, 7.2, 8.3)
// ---------------------------------------------------------------------------

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // "Free" | "Paid" | custom
  priceLabel: text("price_label").notNull(), // display label
  source: text("source").notNull().default("internal"), // "internal" | "wordpress"

  // Limits (Section 7.1)
  monthlyCredits: integer("monthly_credits").notNull().default(0),
  maxLeadsPerRun: integer("max_leads_per_run").notNull().default(0),
  runsPerDay: integer("runs_per_day").notNull().default(0),
  parallelRuns: integer("parallel_runs").notNull().default(0),
  maxLeadsStored: integer("max_leads_stored").notNull().default(0),
  maxLists: integer("max_lists").notNull().default(0),
  monthlyAiTokens: integer("monthly_ai_tokens").notNull().default(0),
  exportRowLimit: integer("export_row_limit").notNull().default(0),

  // Feature flags
  aiEnabled: boolean("ai_enabled").notNull().default(false),
  emailSendingEnabled: boolean("email_sending_enabled").notNull().default(false),
  fullEmailVerification: boolean("full_email_verification").notNull().default(false),
  webhookExport: boolean("webhook_export").notNull().default(false),
  aiExtraction: boolean("ai_extraction").notNull().default(false),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Subscriptions & credits (Section 7)
// ---------------------------------------------------------------------------

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: "restrict" }),
  renewalDate: timestamp("renewal_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const creditLedger = pgTable("credit_ledger", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  runId: integer("run_id"), // references runs.id
  amount: integer("amount").notNull(), // positive = credit, negative = charge
  reason: text("reason").notNull(), // "run_save_lead", "run_reserve", "run_refund", "admin_grant", ...
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// LLM Providers (Section 8.1)
// ---------------------------------------------------------------------------

export const llmProviders = pgTable("llm_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  baseUrl: text("base_url").notNull(),
  apiKeyEncrypted: jsonb("api_key_encrypted"), // { version, iv, tag, ciphertext }
  model: text("model").notNull(),
  fallbackModel: text("fallback_model"),
  jsonMode: text("json_mode").notNull().default("auto"), // auto | json_schema | json_object | none
  temperature: real("temperature").notNull().default(0.2),
  maxOutputTokens: integer("max_output_tokens").notNull().default(1500),
  timeoutSeconds: integer("timeout_seconds").notNull().default(60),
  monthlyTokenBudget: integer("monthly_token_budget").notNull().default(20000000),
  allowedPlans: jsonb("allowed_plans").notNull().default([]), // text[] of plan names
  allowPrivateNetwork: boolean("allow_private_network").notNull().default(false),
  workingJsonMode: text("working_json_mode"), // Section 12.3.4 - remember what works
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AI task router (Section 8.1, 12.1)
export const aiTaskRoutes = pgTable("ai_task_routes", {
  id: serial("id").primaryKey(),
  task: text("task").notNull().unique(), // query_expand | extract_contacts | classify | score | summarize | write_draft | rewrite_draft
  llmProviderId: integer("llm_provider_id").references(() => llmProviders.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiUsage = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  llmProviderId: integer("llm_provider_id").references(() => llmProviders.id, { onDelete: "set null" }),
  task: text("task").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Sources (Section 8.2, 9)
// ---------------------------------------------------------------------------

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  kind: text("kind").notNull(), // osm_overpass | google_places | hunter | generic_rest | ...
  baseUrl: text("base_url").notNull(),
  authType: text("auth_type").notNull().default("none"), // none | header | query | bearer | basic
  apiKeyEncrypted: jsonb("api_key_encrypted"),
  apiSecretEncrypted: jsonb("api_secret_encrypted"),
  extraHeadersEncrypted: jsonb("extra_headers_encrypted"), // { key: encrypted }
  rateLimitPerMinute: integer("rate_limit_per_minute").notNull().default(60),
  rateLimitPerDay: integer("rate_limit_per_day").notNull().default(1000),
  monthlyCallCap: integer("monthly_call_cap"),
  costCreditsPerCall: integer("cost_credits_per_call").notNull().default(0),
  costUsdPerCall: real("cost_usd_per_call").notNull().default(0),
  costInrPerCall: real("cost_inr_per_call").notNull().default(0),
  reliability: real("reliability").notNull().default(0.5), // 0-1
  canFill: jsonb("can_fill").notNull().default([]), // LeadField[]
  allowedPlans: jsonb("allowed_plans").notNull().default([]), // text[]
  attributionText: text("attribution_text"),
  termsUrl: text("terms_url"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sourceCalls = pgTable("source_calls", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  runId: integer("run_id"),
  status: text("status").notNull(), // ok | error | ratelimited
  responseTimeMs: integer("response_time_ms").notNull(),
  costCredits: integer("cost_credits").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sourceCache = pgTable("source_cache", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),
  queryHash: text("query_hash").notNull().unique(), // hash of Source kind + normalized query
  response: jsonb("response").notNull(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const rateBuckets = pgTable("rate_buckets", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  tokens: real("tokens").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Runs (Section 10)
// ---------------------------------------------------------------------------

export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listId: integer("list_id"),
  state: text("state").notNull().default("draft"), // draft | queued | discovering | enriching | verifying | finalizing | done | partial | failed | cancelled
  mode: text("mode").notNull(), // local_business | company_b2b | people_at_company | enrich
  keywords: jsonb("keywords").notNull().default([]),
  businessTypes: jsonb("business_types").notNull().default([]),
  industries: jsonb("industries").notNull().default([]),
  roles: jsonb("roles").notNull().default([]),
  location: jsonb("location"),
  wantedFields: jsonb("wanted_fields").notNull().default([]),
  mustHaveFields: jsonb("must_have_fields").notNull().default([]),
  maxResults: integer("max_results").notNull(),
  sourcesUsed: jsonb("sources_used").notNull().default([]),
  estimatedCredits: integer("estimated_credits").notNull().default(0),
  reservedCredits: integer("reserved_credits").notNull().default(0),
  chargedCredits: integer("charged_credits").notNull().default(0),
  leadsFound: integer("leads_found").notNull().default(0),
  leadsSaved: integer("leads_saved").notNull().default(0),
  duplicatesRemoved: integer("duplicates_removed").notNull().default(0),
  fillRate: jsonb("fill_rate"), // { field: percent }
  timeUsedMs: integer("time_used_ms"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Leads (Section 5)
// ---------------------------------------------------------------------------

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").references(() => runs.id, { onDelete: "set null" }),
  listId: integer("list_id"),
  dataOrigin: text("data_origin").notNull().default("public_listing"), // public_listing | company_website | enrichment_api | user_import
  companyDomain: text("company_domain"),
  matchName: text("match_name"), // normalized lowercase for dedupe (Section 13.1)

  // Section 5.1 output fields
  companyName: text("company_name").notNull(),
  individualName: text("individual_name"),
  role: text("role"),
  personLinkedinUrl: text("person_linkedin_url"),
  companyLinkedinUrl: text("company_linkedin_url"),
  companyWebsite: text("company_website"),
  phone: text("phone"),
  email: text("email"),
  location: text("location"),
  businessType: text("business_type"),
  industry: text("industry"),

  // Extended fields (Section 5.3)
  companySizeRange: text("company_size_range"),
  foundedYear: integer("founded_year"),
  description: text("description"),
  logoUrl: text("logo_url"),
  addressLine: text("address_line"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  countryCode: text("country_code"), // ISO 3166-1 alpha-2
  latitude: real("latitude"),
  longitude: real("longitude"),
  osmId: text("osm_id"),
  googlePlaceId: text("google_place_id"),
  wikidataQid: text("wikidata_qid"),
  lei: text("lei"),
  externalIds: jsonb("external_ids"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  xUrl: text("x_url"),
  youtubeUrl: text("youtube_url"),
  whatsappNumber: text("whatsapp_number"),
  emailStatus: text("email_status"), // valid | invalid | risky | catch_all | unknown
  emailType: text("email_type"), // person | role | unknown
  phoneType: text("phone_type"), // mobile | fixed_line | voip | unknown
  websiteStatus: integer("website_status"), // HTTP code
  rating: real("rating"),
  reviewCount: integer("review_count"),
  roleNormalized: text("role_normalized"), // Owner/Founder | C-Level | Director | Manager | Staff | Other
  seniority: text("seniority"),
  department: text("department"),
  leadScore: integer("lead_score"), // 0-100
  scoreReasons: jsonb("score_reasons"), // text[]
  aiSummary: text("ai_summary"), // max 200 chars
  fieldSources: jsonb("field_sources"), // { [field]: [{source, value, url, fetched_at}] }
  fieldConfidence: jsonb("field_confidence"), // { [field]: number 0-1 }
  crmStage: text("crm_stage").notNull().default("New"),
  tags: jsonb("tags").notNull().default([]),
  ownerUserId: integer("owner_user_id").references(() => users.id),
  lastContactedAt: timestamp("last_contacted_at"),
  nextTaskAt: timestamp("next_task_at"),
  doNotContact: boolean("do_not_contact").notNull().default(false),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  // Indexes (migration 0001). Must live in the table callback: drizzle-orm
  // 0.41 IndexBuilderOn.on() requires ExtraConfigColumn refs (t.col), not
  // raw column objects — raw columns crash at import with
  // `JSON.parse(JSON.stringify(undefined))`.
  domain: index("leads_company_domain_idx").on(t.companyDomain),
  run: index("leads_run_id_idx").on(t.runId),
  list: index("leads_list_id_idx").on(t.listId),
  crmStage: index("leads_crm_stage_idx").on(t.crmStage),
}));

export const leadPeople = pgTable("lead_people", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  linkedinUrl: text("linkedin_url"),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Raw leads (Section 9.1)
// ---------------------------------------------------------------------------

export const rawLeads = pgTable("raw_leads", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
  sourceId: integer("source_id").references(() => sources.id, { onDelete: "set null" }),
  fields: jsonb("fields").notNull(), // Partial<Record<LeadField, string>>
  extended: jsonb("extended").notNull().default({}),
  sourceKind: text("source_kind").notNull(),
  sourceRecordId: text("source_record_id"),
  sourceUrl: text("source_url"),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
}, (t) => ({
  run: index("raw_leads_run_id_idx").on(t.runId), // matches migration 0001
}));

// ---------------------------------------------------------------------------
// CRM: Lists, stages, tags (Section 14)
// ---------------------------------------------------------------------------

export const lists = pgTable("lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const listLeads = pgTable("list_leads", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").notNull().defaultNow(),
}, (table) => ({
  uniq: unique().on(table.listId, table.leadId),
}));

export const stages = pgTable("stages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6b7280"),
});

export const leadTags = pgTable("lead_tags", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => ({
  uniq: unique().on(table.leadId, table.tagId),
}));

// ---------------------------------------------------------------------------
// Custom fields (Section 14.1.8)
// ---------------------------------------------------------------------------

export const customFields = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // text | number | date | select
  options: jsonb("options"), // for select type
});

export const customFieldValues = pgTable("custom_field_values", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  fieldId: integer("field_id").notNull().references(() => customFields.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
}, (table) => ({
  uniq: unique().on(table.leadId, table.fieldId),
}));

// ---------------------------------------------------------------------------
// Notes, tasks, activities (Section 14.1)
// ---------------------------------------------------------------------------

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  dueDate: timestamp("due_date"),
  isReminderSent: boolean("is_reminder_sent").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(), // run_found | field_changed | draft_made | message_sent | stage_changed
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Outreach: Offer Profile, Sequences, Drafts (Section 15)
// ---------------------------------------------------------------------------

export const offerProfiles = pgTable("offer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  website: text("website"),
  whatSells: text("what_sells").notNull(),
  idealCustomer: text("ideal_customer").notNull(),
  valuePoints: jsonb("value_points").notNull().default([]), // text[]
  proof: text("proof"),
  callToAction: text("call_to_action").notNull(),
  senderName: text("sender_name").notNull(),
  signature: text("signature"),
  tone: text("tone").notNull().default("friendly"), // friendly | formal | direct
  language: text("language").notNull().default("en"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sequences = pgTable("sequences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sequenceSteps = pgTable("sequence_steps", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => sequences.id, { onDelete: "cascade" }),
  step: integer("step").notNull(), // 1 = first message
  channel: text("channel").notNull(), // email | followup_1 | followup_2 | linkedin | whatsapp | call
  waitDays: integer("wait_days").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const drafts = pgTable("drafts", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sequenceStep: integer("sequence_step").notNull().default(1),
  channel: text("channel").notNull().default("email"),
  subject: text("subject"),
  body: text("body").notNull(),
  personalizationFacts: jsonb("personalization_facts").notNull().default([]), // text[]
  status: text("status").notNull().default("pending"), // pending | approved | edited | regenerated | rejected | sent
  markSentAt: timestamp("mark_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Suppression List (Section 8.6, 14.1.12)
// ---------------------------------------------------------------------------

export const suppressionEntries = pgTable("suppression_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }), // null = global
  type: text("type").notNull(), // email | domain | phone
  value: text("value").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniq: unique().on(table.userId, table.type, table.value),
}));

// ---------------------------------------------------------------------------
// Taxonomy (Section 5.5)
// ---------------------------------------------------------------------------

export const taxonomyIndustries = pgTable("taxonomy_industries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const taxonomyBusinessTypes = pgTable("taxonomy_business_types", {
  id: serial("id").primaryKey(),
  industryId: integer("industry_id").notNull().references(() => taxonomyIndustries.id, { onDelete: "cascade" }),
  name: text("name").notNull().unique(),
  osmTags: jsonb("osm_tags").notNull().default({}), // Section 5.5 map
  googleTypes: jsonb("google_types").notNull().default([]), // Section 5.5 map
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Exports, imports (Section 6)
// ---------------------------------------------------------------------------

export const exports = pgTable("exports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // template_xlsx | template_csv | extended_xlsx | selected | json | webhook
  filters: jsonb("filters").notNull().default({}),
  columns: jsonb("columns"),
  filePath: text("file_path"),
  rowCount: integer("row_count"),
  status: text("status").notNull().default("pending"), // pending | done | failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const imports = pgTable("imports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  status: text("status").notNull().default("pending"), // pending | done | failed
  rowCount: integer("row_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Audit log (Section 8.10)
// ---------------------------------------------------------------------------

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  target: text("target"),
  diff: jsonb("diff"), // no secrets
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// WordPress SSO (Section 16)
// ---------------------------------------------------------------------------

export const wpSsoJti = pgTable("wp_sso_jti", {
  id: serial("id").primaryKey(),
  jti: text("jti").notNull().unique(),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
});

// ---------------------------------------------------------------------------
// Settings (Section 8)
// ---------------------------------------------------------------------------

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

