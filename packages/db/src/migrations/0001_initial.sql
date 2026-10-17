-- Phase 0 initial migration (SPEC Section 20.3)
-- Run with: pnpm --filter @nifty-leads/db migrate

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image_url TEXT,
  email_verified TIMESTAMPTZ,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  plan_source TEXT NOT NULL DEFAULT 'internal',
  wordpress_user_id TEXT,
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Better Auth sessions
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Better Auth accounts
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Better Auth verifications
CREATE TABLE verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- plans
CREATE TABLE plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price_label TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'internal',
  monthly_credits INTEGER NOT NULL DEFAULT 0,
  max_leads_per_run INTEGER NOT NULL DEFAULT 0,
  runs_per_day INTEGER NOT NULL DEFAULT 0,
  parallel_runs INTEGER NOT NULL DEFAULT 0,
  max_leads_stored INTEGER NOT NULL DEFAULT 0,
  max_lists INTEGER NOT NULL DEFAULT 0,
  monthly_ai_tokens INTEGER NOT NULL DEFAULT 0,
  export_row_limit INTEGER NOT NULL DEFAULT 0,
  ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  email_sending_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  full_email_verification BOOLEAN NOT NULL DEFAULT FALSE,
  webhook_export BOOLEAN NOT NULL DEFAULT FALSE,
  ai_extraction BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- subscriptions
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  renewal_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- credit_ledger
CREATE TABLE credit_ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_id INTEGER,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- llm_providers
CREATE TABLE llm_providers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  api_key_encrypted JSONB,
  model TEXT NOT NULL,
  fallback_model TEXT,
  json_mode TEXT NOT NULL DEFAULT 'auto',
  temperature REAL NOT NULL DEFAULT 0.2,
  max_output_tokens INTEGER NOT NULL DEFAULT 1500,
  timeout_seconds INTEGER NOT NULL DEFAULT 60,
  monthly_token_budget INTEGER NOT NULL DEFAULT 20000000,
  allowed_plans JSONB NOT NULL DEFAULT '[]',
  allow_private_network BOOLEAN NOT NULL DEFAULT FALSE,
  working_json_mode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ai_task_routes
CREATE TABLE ai_task_routes (
  id SERIAL PRIMARY KEY,
  task TEXT NOT NULL UNIQUE,
  llm_provider_id INTEGER REFERENCES llm_providers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ai_usage
CREATE TABLE ai_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  llm_provider_id INTEGER REFERENCES llm_providers(id) ON DELETE SET NULL,
  task TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sources
CREATE TABLE sources (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  base_url TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'none',
  api_key_encrypted JSONB,
  api_secret_encrypted JSONB,
  extra_headers_encrypted JSONB,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  rate_limit_per_day INTEGER NOT NULL DEFAULT 1000,
  monthly_call_cap INTEGER,
  cost_credits_per_call INTEGER NOT NULL DEFAULT 0,
  cost_usd_per_call REAL NOT NULL DEFAULT 0,
  cost_inr_per_call REAL NOT NULL DEFAULT 0,
  reliability REAL NOT NULL DEFAULT 0.5,
  can_fill JSONB NOT NULL DEFAULT '[]',
  allowed_plans JSONB NOT NULL DEFAULT '[]',
  attribution_text TEXT,
  terms_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- source_calls
CREATE TABLE source_calls (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  run_id INTEGER,
  status TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  cost_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- source_cache
CREATE TABLE source_cache (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  query_hash TEXT NOT NULL UNIQUE,
  response JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- rate_buckets
CREATE TABLE rate_buckets (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  tokens REAL NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- runs
CREATE TABLE runs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id INTEGER,
  state TEXT NOT NULL DEFAULT 'draft',
  mode TEXT NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]',
  business_types JSONB NOT NULL DEFAULT '[]',
  industries JSONB NOT NULL DEFAULT '[]',
  roles JSONB NOT NULL DEFAULT '[]',
  location JSONB,
  wanted_fields JSONB NOT NULL DEFAULT '[]',
  must_have_fields JSONB NOT NULL DEFAULT '[]',
  max_results INTEGER NOT NULL,
  sources_used JSONB NOT NULL DEFAULT '[]',
  estimated_credits INTEGER NOT NULL DEFAULT 0,
  reserved_credits INTEGER NOT NULL DEFAULT 0,
  charged_credits INTEGER NOT NULL DEFAULT 0,
  leads_found INTEGER NOT NULL DEFAULT 0,
  leads_saved INTEGER NOT NULL DEFAULT 0,
  duplicates_removed INTEGER NOT NULL DEFAULT 0,
  fill_rate JSONB,
  time_used_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- leads
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  run_id INTEGER REFERENCES runs(id) ON DELETE SET NULL,
  list_id INTEGER,
  data_origin TEXT NOT NULL DEFAULT 'public_listing',
  company_domain TEXT,
  match_name TEXT,
  company_name TEXT NOT NULL,
  individual_name TEXT,
  role TEXT,
  person_linkedin_url TEXT,
  company_linkedin_url TEXT,
  company_website TEXT,
  phone TEXT,
  email TEXT,
  location TEXT,
  business_type TEXT,
  industry TEXT,
  company_size_range TEXT,
  founded_year INTEGER,
  description TEXT,
  logo_url TEXT,
  address_line TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country_code TEXT,
  latitude REAL,
  longitude REAL,
  osm_id TEXT,
  google_place_id TEXT,
  wikidata_qid TEXT,
  lei TEXT,
  external_ids JSONB,
  facebook_url TEXT,
  instagram_url TEXT,
  x_url TEXT,
  youtube_url TEXT,
  whatsapp_number TEXT,
  email_status TEXT,
  email_type TEXT,
  phone_type TEXT,
  website_status INTEGER,
  rating REAL,
  review_count INTEGER,
  role_normalized TEXT,
  seniority TEXT,
  department TEXT,
  lead_score INTEGER,
  score_reasons JSONB,
  ai_summary TEXT,
  field_sources JSONB,
  field_confidence JSONB,
  crm_stage TEXT NOT NULL DEFAULT 'New',
  tags JSONB NOT NULL DEFAULT '[]',
  owner_user_id INTEGER REFERENCES users(id),
  last_contacted_at TIMESTAMPTZ,
  next_task_at TIMESTAMPTZ,
  do_not_contact BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- lead_people
CREATE TABLE lead_people (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  linkedin_url TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- raw_leads
CREATE TABLE raw_leads (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  fields JSONB NOT NULL,
  extended JSONB NOT NULL DEFAULT '{}',
  source_kind TEXT NOT NULL,
  source_record_id TEXT,
  source_url TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- lists
CREATE TABLE lists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- list_leads
CREATE TABLE list_leads (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (list_id, lead_id)
);

-- stages
CREATE TABLE stages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

-- tags
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280'
);

-- lead_tags
CREATE TABLE lead_tags (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE (lead_id, tag_id)
);

-- custom_fields
CREATE TABLE custom_fields (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB
);

-- custom_field_values
CREATE TABLE custom_field_values (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  field_id INTEGER NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  UNIQUE (lead_id, field_id)
);

-- notes
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tasks
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  is_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- activities
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- offer_profiles
CREATE TABLE offer_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  website TEXT,
  what_sells TEXT NOT NULL,
  ideal_customer TEXT NOT NULL,
  value_points JSONB NOT NULL DEFAULT '[]',
  proof TEXT,
  call_to_action TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  signature TEXT,
  tone TEXT NOT NULL DEFAULT 'friendly',
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sequences
CREATE TABLE sequences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sequence_steps
CREATE TABLE sequence_steps (
  id SERIAL PRIMARY KEY,
  sequence_id INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  channel TEXT NOT NULL,
  wait_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- drafts
CREATE TABLE drafts (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sequence_step INTEGER NOT NULL DEFAULT 1,
  channel TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  body TEXT NOT NULL,
  personalization_facts JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  mark_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- suppression_entries
CREATE TABLE suppression_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, type, value)
);

-- taxonomy_industries
CREATE TABLE taxonomy_industries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- taxonomy_business_types
CREATE TABLE taxonomy_business_types (
  id SERIAL PRIMARY KEY,
  industry_id INTEGER NOT NULL REFERENCES taxonomy_industries(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  osm_tags JSONB NOT NULL DEFAULT '{}',
  google_types JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- exports
CREATE TABLE exports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  columns JSONB,
  file_path TEXT,
  row_count INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- imports
CREATE TABLE imports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  row_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- audit_log
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- wp_sso_jti
CREATE TABLE wp_sso_jti (
  id SERIAL PRIMARY KEY,
  jti TEXT NOT NULL UNIQUE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);

-- settings
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX leads_company_domain_idx ON leads(company_domain);
CREATE INDEX leads_run_id_idx ON leads(run_id);
CREATE INDEX leads_list_id_idx ON leads(list_id);
CREATE INDEX leads_crm_stage_idx ON leads(crm_stage);
CREATE INDEX runs_user_id_idx ON runs(user_id);
CREATE INDEX credit_ledger_user_id_idx ON credit_ledger(user_id);
CREATE INDEX source_calls_source_id_idx ON source_calls(source_id);
CREATE INDEX raw_leads_run_id_idx ON raw_leads(run_id);
