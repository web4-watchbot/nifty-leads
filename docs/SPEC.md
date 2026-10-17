# Nifty Leads — Build Specification for opencode

**Writing style:** ASD-STE100 Simplified Technical English (short sentences, one instruction per sentence, active voice, one meaning for each term).
**Version:** 1.0
**Date:** 17 October 2026
**Owner:** Madan Chauhan (niftytechfinds.com)
**Source template:** `leads_crreate.xlsx` (12 columns, header row only)

> You can change the app name. Replace "Nifty Leads" in all files before Phase 0.

---

## 0. How to use this file (for the human owner)

1. Make an empty project folder.
2. Copy this file into the folder as `docs/SPEC.md`.
3. Open the folder in opencode.
4. Push **Tab** to select the **Plan** agent.
5. Send this message: `Read docs/SPEC.md. Write the plan for Phase 0 only. Do not write code.`
6. Read the plan. Correct the plan if necessary.
7. Push **Tab** to select the **Build** agent.
8. Send this message: `Do Phase 0 from docs/SPEC.md. Stop at the end of the phase.`
9. Do steps 4 to 8 again for each phase in Section 18.
10. Do not paste API keys into the opencode chat. Enter keys only in the Admin Settings page of the app.

---

## 1. Instructions for the agent

### 1.1 Your task

You are the build agent for this project. You build a web app with the name "Nifty Leads". The app finds business leads from many data sources. The app fills the 12 columns of the source template. The app has a Free plan and a Paid plan. The app has a CRM and an AI outreach module. The owner publishes the app on a WordPress site later.

### 1.2 Work rules

1. Do one phase at a time. Stop at the end of each phase.
2. Before you write code for a phase, write the plan in `docs/plans/phase-N.md`.
3. In Phase 0, make the file `AGENTS.md` in the project root. Copy the rules of this section into it. Add a link to `docs/SPEC.md`.
4. Use TypeScript in strict mode for all app code.
5. Write unit tests for each module that changes data.
6. Run all tests before you report a phase as complete.
7. Do not put secrets in code, logs, tests, fixtures or git history.
8. Do not call live paid APIs in tests. Use recorded fixtures.
9. Do not copy code from GPL or AGPL repositories. Use them for design ideas only (Section 19).
10. If you do not know the current API of a library or a provider, read its current documentation. Do not guess.
11. If a requirement is not clear, write the question in `docs/QUESTIONS.md`. Use the safest default. Continue the work.
12. Do not write a database migration that deletes user data without a backup step.
13. Use each term in Section 2 with one meaning only.
14. At the end of each phase, write `docs/reports/phase-N.md`. Include: what you did, how to run it, the test result, and open questions.

---

## 2. Terms

| Term | Meaning in this project |
|---|---|
| Admin | The owner of the platform. The Admin controls all settings. |
| User | A customer who logs in and uses the platform. |
| Plan | A set of limits and features. The defaults are "Free" and "Paid". The Admin can add more Plans. |
| Credit | A unit of usage. Each action costs Credits. The Admin sets the cost. |
| Lead | One record. A Lead has the 12 output fields (Section 5) and extended fields. |
| List | A named group of Leads that belongs to one User. |
| Source | An external API, data set or service that gives raw lead data. |
| Source Connector | The code and the settings that connect one Source to the app. |
| Run | One lead search job. A User starts a Run. |
| Enricher | A pipeline step that adds data to a Lead (for example, a website crawl). |
| LLM Provider | An OpenAI-compatible API. It has a base URL, an API key and a model name. |
| Offer Profile | A description of what the User sells. The AI uses it to write messages. |
| Draft | A message that the AI writes. A Draft waits for review by the User. |
| Sequence | An ordered set of Drafts: the first message and the follow-up messages. |
| Suppression List | Emails, domains and phone numbers that the app must never contact. |
| Taxonomy | The Admin list of Business Types and Industries. |
| Template Export | An export with the 12 columns of the source template, in the same order. |

---

## 3. Product summary

### 3.1 Goal

The app finds leads for a business type, a location, an industry and target roles. The app collects data from free open-data Sources and from paid Sources. The app merges, cleans and verifies the data. The app exports the data in the format of `leads_crreate.xlsx`. The User can manage the Leads in a CRM. The AI writes outreach messages with the Admin's LLM Provider.

### 3.2 Plans (summary)

| Feature | Free Plan | Paid Plan |
|---|---|---|
| Lead Sources | Free open-data Sources only (Section 9.2) | All Sources that the Admin enables for Paid (Sections 9.2 and 9.3) |
| AI (LLM) features | Off by default. The Admin can give a small AI budget. | On. Uses the Admin's LLM Provider. |
| Data extraction | Rule-based extraction only | Rule-based extraction plus AI extraction |
| Email verification | Syntax and MX check only | Full verification (Section 13.4) |
| Exports | CSV and XLSX, row limit | CSV, XLSX, JSON, webhook |
| CRM | One List, limited contacts | Unlimited Lists, full CRM |
| Outreach | Merge-field templates, no AI | AI Drafts, Sequences, review queue |
| Email sending | No | Phase 2: the User connects an email API (Resend and others) |

### 3.3 Scope by phase

- **Phase 1:** Lead finding, Free and Paid Plans, Admin Settings, exports, CRM, AI Drafts, manual send, WordPress bridge.
- **Phase 2:** User email APIs (Resend and others), automatic sending, reply detection, payments, CRM sync, scheduled Runs.

---

## 4. Technology stack

Use this stack. If you must change a part, write the reason in `docs/QUESTIONS.md` first.

| Part | Choice | Reason |
|---|---|---|
| Language | TypeScript (strict) | One language for the web app and the worker |
| Web app | Next.js (App Router) | The owner already deploys to Vercel |
| UI | Tailwind CSS and shadcn/ui | Fast, accessible components (MIT) |
| Database | PostgreSQL 16 (Supabase or any Postgres) | JSONB for provenance, full-text search |
| ORM | Drizzle ORM | Typed schema and migrations |
| Validation | Zod | One schema for API input and LLM output |
| Auth | Better Auth with the email OTP plugin | Email login codes, sessions, roles |
| Job queue | pg-boss | Uses Postgres. No Redis is necessary. |
| Worker | A separate Node.js process | Long Runs cannot run inside serverless functions |
| Website crawl | Crawlee (CheerioCrawler first, Playwright only when necessary) | Polite crawl with queue and retry |
| Phone numbers | libphonenumber-js (max metadata) | E.164 format and phone type |
| LLM client | `openai` npm package with a custom `baseURL` | Works with all OpenAI-compatible providers |
| XLSX export | ExcelJS | Headers, styles, hyperlinks |
| Logs | pino (JSON logs) | Structured logs without secrets |
| Deploy | Docker Compose: `web`, `worker`, `postgres` | One command on a VPS. The `web` service can also deploy to Vercel. |
| WordPress bridge | PHP plugin with `firebase/php-jwt` | Single sign-on from WordPress |

---

## 5. Lead output fields (from `leads_crreate.xlsx`)

### 5.1 Template headers

The Template Export must use these headers. Use the same text, the same spelling and the same order. Keep the spelling "Linkedin" as in the template.

```text
A  Sr. No.
B  Company Name
C  Individual Name
D  Role
E  User Linkedin Profile URL
F  Company Linkedin URL
G  Company Website
H  Phone Number
I  Email Address
J  Location
K  Business Type
L  Industry
```

### 5.2 Field specification

| Col | Header | DB key | Type | Rules | Free Sources | Paid Sources |
|---|---|---|---|---|---|---|
| A | Sr. No. | (none) | integer | Make this number at export time: 1, 2, 3 … in export order. Do not store it. | — | — |
| B | Company Name | `company_name` | text, max 200 | Trim spaces. Keep the original letter case. For matching only, remove legal suffixes (Pvt Ltd, LLC, GmbH). | OSM `name`, Wikidata label, GLEIF legal name, website JSON-LD `Organization.name`, `og:site_name` | Google Places `displayName`, SERP map results, Apollo, Foursquare |
| C | Individual Name | `individual_name` | text, max 120 | One decision maker. Format "First Last". Leave empty if unknown. Never guess a name. | JSON-LD `Person.name`, team page (rule-based) | AI extraction from team or about page, Hunter, Apollo, People Data Labs, SERP result title |
| D | Role | `role` | text, max 120 | Use the job title as published. Also store `role_normalized` (Section 5.3). | JSON-LD `Person.jobTitle` | AI extraction, Hunter `position`, Apollo `title` |
| E | User Linkedin Profile URL | `person_linkedin_url` | URL | Must match `linkedin.com/in/<slug>`. Store as `https://www.linkedin.com/in/<slug>/`. | Links on the company website | SERP API query `site:linkedin.com/in "<name>" "<company>"`, Apollo, People Data Labs |
| F | Company Linkedin URL | `company_linkedin_url` | URL | Must match `linkedin.com/company/<slug>` (also `/school/` and `/showcase/`). Store as `https://www.linkedin.com/company/<slug>/`. | Website footer links, Wikidata LinkedIn company ID | SERP API query `site:linkedin.com/company "<company>"`, Apollo |
| G | Company Website | `company_website` | URL | Store as `https://<domain>/`. Also store `company_domain`. Do not use social or directory URLs here (Section 13.1). | OSM `website` / `contact:website` / `url`, Wikidata official website | Google Places `websiteUri`, SERP results |
| H | Phone Number | `phone` | text (E.164) | Parse with the country of the Lead. Store E.164. Export in international format as text, so Excel keeps the "+". | OSM `phone` / `contact:phone` / `contact:mobile`, website `tel:` links and page text | Google Places `internationalPhoneNumber`, SERP results, enrichment APIs |
| I | Email Address | `email` | email | Lowercase. Check syntax and MX. Flag role emails (info@, sales@). Flag disposable domains. Prefer a person email to a role email. | Website `mailto:` links and page text, OSM `email` / `contact:email`, JSON-LD `email` | Hunter, Apollo, Snov.io, Prospeo, then a verifier (Section 13.4) |
| J | Location | `location` | text | Display format: "City, State, Country". Also store the full address parts and coordinates (Section 5.3). | OSM `addr:*` tags, Nominatim or Photon reverse geocode | Google Places `formattedAddress` and `addressComponents` |
| K | Business Type | `business_type` | text from Taxonomy | A specific type, for example "Dental Clinic". Map from OSM tags or Google place types first. Use AI only if no map exists. | OSM tag map (for example `amenity=dentist` → "Dental Clinic") | Google `primaryType` map, AI classification |
| L | Industry | `industry` | text from Taxonomy | A broad sector, for example "Healthcare & Medical". Derive from Business Type first. Use AI only if no map exists. | Business Type → Industry map, Wikidata industry | AI classification, Apollo industry |

### 5.3 Extended fields (stored, optional in exports)

Store these fields for each Lead. Show them in the "Extended Export" and in the Lead detail page.

- Company: `company_domain`, `company_size_range`, `founded_year`, `description` (max 300 characters), `logo_url`.
- Address: `address_line`, `city`, `state`, `postal_code`, `country_code` (ISO 3166-1 alpha-2), `latitude`, `longitude`.
- Source IDs: `osm_id`, `google_place_id`, `wikidata_qid`, `lei`, `external_ids` (JSONB).
- Social: `facebook_url`, `instagram_url`, `x_url`, `youtube_url`, `whatsapp_number`.
- Quality: `email_status` (valid, invalid, risky, catch_all, unknown), `email_type` (person, role, unknown), `phone_type` (mobile, fixed_line, voip, unknown), `website_status` (HTTP code), `rating`, `review_count`.
- Role: `role_normalized` (Owner/Founder, C-Level, Director, Manager, Staff, Other), `seniority`, `department`.
- AI: `lead_score` (0–100), `score_reasons` (array of text), `ai_summary` (max 200 characters).
- Provenance: `field_sources` (JSONB). For each field, keep a list of `{source, value, url, fetched_at}`.
- Confidence: `field_confidence` (JSONB). For each field, keep a number from 0 to 1.
- CRM: `stage`, `tags`, `owner_user_id`, `last_contacted_at`, `next_task_at`, `do_not_contact`.
- System: `run_id`, `list_id`, `data_origin` (public_listing, company_website, enrichment_api, user_import), `created_at`, `updated_at`.

### 5.4 Fill rules

1. Never invent a value. If no Source gives a value, leave the cell empty.
2. Do not write "N/A", "-" or "null" in exports. Use an empty cell.
3. Keep the provenance of each value in `field_sources`.
4. When two Sources give different values, use the value with the highest confidence. Keep all values in `field_sources`.
5. One Lead is one company plus zero or one person. If a company has more than one decision maker, make one Lead for each person. Link the Leads with `company_domain`.

### 5.5 Default Taxonomy

Put this Industry list in the seed data. The Admin can edit it.

Agriculture · Automotive · Banking & Financial Services · Construction & Real Estate · Consumer Goods & Retail · Education · Energy & Utilities · Food & Beverage · Government & Public Sector · Healthcare & Medical · Hospitality & Travel · Information Technology & Software · Legal & Professional Services · Logistics & Transportation · Manufacturing · Marketing, Media & Advertising · Non-Profit · Personal Services & Beauty · Telecommunications · Wholesale & Distribution · Other

Seed at least 150 Business Types. Link each Business Type to one Industry. Add the OSM tag map and the Google place type map for each Business Type. Store the Taxonomy in the database, not in code.

---

## 6. Outputs

The User selects the outputs before a Run or at export time.

### 6.1 Export types

1. **Template Export (XLSX).** The 12 headers of Section 5.1. Sheet name "Sheet1". Bold header row. Freeze the header row. Add an auto-filter. Make URL cells clickable. Set the Phone Number cells to text format.
2. **Template Export (CSV).** The same 12 columns. UTF-8 with BOM, so Excel shows non-English characters correctly.
3. **Extended Export (XLSX).** Sheet 1 is the Template Export. Sheet 2 ("Details") has the extended fields of Section 5.3.
4. **Selected Columns Export.** The User selects columns. Keep the template order.
5. **JSON Export.** An array of Lead objects with all fields and provenance.
6. **Webhook (Paid).** POST each new Lead to a User URL (for n8n, Zapier or Make). Sign the body with HMAC-SHA256.
7. **Run Report.** For each Run, show: Leads found, Leads saved, duplicates removed, fill rate for each of the 12 columns (percent), Sources used, Credits used, time used.

### 6.2 Export filters

The User can export only the Leads that match these filters:

- Has email / has verified email / has phone / has website / has person name / has LinkedIn URL.
- Lead score at or above a value.
- Business Type, Industry, city, country.
- CRM stage and tags.
- Not in the Suppression List (always applied).

### 6.3 Import ("Enrich my sheet")

1. The User uploads an XLSX or CSV file with the template headers.
2. The app reads the rows. The app accepts files with missing columns.
3. The app makes one Lead for each row with `data_origin = user_import`.
4. The User selects which empty fields to fill.
5. The app runs the Enrichers on these Leads only.
6. The app never changes a value that the User imported, unless the User selects "Replace".
7. The User downloads the file in the same template format.

---

## 7. Plans, limits and Credits

### 7.1 Default limits (the Admin can change all values)

| Limit | Free Plan | Paid Plan |
|---|---|---|
| Monthly Credits | 100 | 3,000 |
| Maximum Leads in one Run | 25 | 500 |
| Runs in one day | 2 | 20 |
| Parallel Runs | 1 | 3 |
| Leads stored in CRM | 200 | 20,000 |
| Lists | 1 | Unlimited |
| AI tokens in one month | 0 | 2,000,000 |
| Export row limit | 100 | Unlimited |
| Data retention after account deletion | 0 days | 0 days |

### 7.2 Default Credit costs (the Admin can change all values)

| Action | Credits |
|---|---|
| One Lead saved from a free Source | 1 |
| One Lead saved from a paid Source | 2 |
| One email found by an enrichment API | 1 |
| One full email verification | 1 |
| One AI Draft | 1 |
| One AI extraction of one web page | 0 (the AI token limit applies) |

### 7.3 Credit rules

1. Before a Run starts, show the estimated Credits and the estimated time.
2. Reserve the estimated Credits when the Run starts.
3. At the end of the Run, charge only for Leads that the app saved. Return the unused Credits.
4. Do not charge for duplicates.
5. If a Run fails because of a Source error, do not charge for the failed part.
6. Record each Credit change in the `credit_ledger` table.
7. Reset the monthly Credits on the Plan renewal date.

### 7.4 Free Plan abuse control

1. Let one free account for each verified email address.
2. Block disposable email domains at signup. Use the `disposable-email-domains` list. Update it each week.
3. Limit signups from one IP address (default: 3 in 24 hours).
4. Show paid features as locked, with an "Upgrade" button.

---

## 8. Admin Settings

Only users with the `admin` role can open these pages. In Phase 0, read `ADMIN_EMAILS` from the environment to make the first Admin.

### 8.1 LLM Providers

The Admin can add more than one LLM Provider. Each LLM Provider has these fields:

| Field | Example | Rule |
|---|---|---|
| Name | "OpenRouter main" | Required |
| Base URL | `https://openrouter.ai/api/v1` | Required. Must be HTTPS, unless "Allow private network" is on. |
| API key | `sk-…` | Required. Encrypt at rest (Section 17.1). Show only the last 4 characters. |
| Model | `openai/gpt-4o-mini` | Required. Free text. |
| Fallback model | (optional) | Use if the first model fails 2 times. |
| JSON mode | auto / json_schema / json_object / none | Default: auto (Section 12.3) |
| Temperature | 0.2 | Range 0–1 |
| Max output tokens | 1,500 | |
| Timeout (seconds) | 60 | |
| Monthly token budget | 20,000,000 | Stop AI tasks when the budget is used |
| Allowed Plans | Paid | Multi-select |
| Allow private network | off | Lets `localhost` URLs (Ollama, LM Studio) on a self-hosted install |

Add a "Test connection" button. It sends one short request and shows the reply time and the model name.

Add a task router. For each AI task in Section 12, the Admin selects one LLM Provider.

Show these presets for the Base URL field. The Admin can type any other URL.

| Preset | Base URL |
|---|---|
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| Together AI | `https://api.together.xyz/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| Mistral | `https://api.mistral.ai/v1` |
| Google Gemini (OpenAI-compatible) | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| Anthropic (OpenAI SDK compatibility) | `https://api.anthropic.com/v1/` |
| Ollama (self-hosted) | `http://localhost:11434/v1` |
| LM Studio (self-hosted) | `http://localhost:1234/v1` |

Optional setting: "Let Paid Users add their own LLM key". Default: off. If on, a User key replaces the Admin key for that User only. Do not charge AI Credits for User keys.

### 8.2 Lead Sources

The Admin can add, edit, test, enable and disable Sources. Each Source has these fields:

| Field | Rule |
|---|---|
| Name | Required |
| Kind | One of the built-in connectors (Sections 9.2, 9.3), `generic_rest` (Section 9.4), `gosom_service`, `apify_actor` or `searxng` |
| Base URL | Required for all Kinds. Default value comes from the connector. |
| Auth type | none / header / query parameter / bearer / basic |
| API key and secret | Encrypt at rest. Show only the last 4 characters. |
| Extra headers | Key-value pairs. Encrypt the values. |
| Rate limit | Requests per minute and requests per day |
| Monthly call cap | Stop the Source when the cap is reached |
| Cost for each call | Credits and real money (USD or INR), for the cost report |
| Reliability | A number from 0 to 1. Used for confidence (Section 13.5). |
| Fields it can fill | Multi-select from the 12 output fields |
| Allowed Plans | Multi-select |
| Attribution text | Shown in the UI and in exports when required (for example "© OpenStreetMap contributors") |
| Terms URL | Link to the provider's terms of use |
| Enabled | on / off |

Add a "Test Source" button. It runs one sample query. It shows the raw response and the mapped fields side by side.

### 8.3 Plans and Credits

1. The Admin can add, edit and archive Plans.
2. Each Plan has: name, price label, the limits of Section 7.1, allowed Sources, allowed LLM Providers and feature flags.
3. The Admin can set the Credit costs of Section 7.2.
4. The Admin can give extra Credits to one User.
5. Plan source: `internal` (the Admin sets the Plan) or `wordpress` (the WordPress bridge sets the Plan, Section 16).

### 8.4 Taxonomy

1. The Admin can edit Business Types, Industries and the maps of Section 5.5.
2. The Admin can import and export the Taxonomy as CSV.

### 8.5 System email (Phase 1)

The app sends login codes and notices. This is not outreach email.

1. The Admin selects a provider: Resend or SMTP.
2. The Admin enters the API key or the SMTP settings, the "From" name and the "From" address.
3. Add a "Send test email" button.

### 8.6 Compliance

1. Global Suppression List: the Admin can add emails, domains and phone numbers. Import CSV.
2. Blocked countries for outreach (multi-select).
3. Default unsubscribe text and postal address for the email footer (Phase 2).
4. Data retention: delete Leads that have no activity after N days (default: off).
5. A "Data subject request" form: find all Leads for one email or phone, then export or delete them.

### 8.7 Users

List, search, change Plan, add Credits, suspend, delete, and "View as User" (read-only).

### 8.8 Usage and cost

1. Show the Credits used by each User, each Plan and each Source.
2. Show the LLM tokens used by each LLM Provider and each AI task.
3. Show the real-money cost from the "Cost for each call" values.
4. Show cost in USD and INR. The Admin sets the exchange rate.

### 8.9 Jobs monitor

Show the queue state: waiting, active, failed and completed jobs. Let the Admin retry or cancel a job.

### 8.10 Audit log

Record each settings change: who, when, what changed. Do not record secret values.

---

## 9. Source Connector design

### 9.1 Interface

Make each Source Connector implement this interface. Put connectors in `packages/sources/<kind>/`.

```ts
export type LeadField =
  | "company_name" | "individual_name" | "role"
  | "person_linkedin_url" | "company_linkedin_url" | "company_website"
  | "phone" | "email" | "location" | "business_type" | "industry";

export interface SearchQuery {
  mode: "local_business" | "company_b2b" | "people_at_company" | "enrich";
  keywords: string[];            // for example ["dentist", "dental clinic"]
  businessTypes: string[];       // Taxonomy names
  industries: string[];          // Taxonomy names
  roles: string[];               // for example ["Owner", "Marketing Manager"]
  location?: {
    text?: string;               // "Pune, Maharashtra, India"
    countryCode?: string;        // "IN"
    bbox?: [number, number, number, number]; // south, west, north, east
    center?: { lat: number; lng: number };
    radiusKm?: number;
  };
  wantedFields: LeadField[];
  maxResults: number;
  seedLeads?: RawLead[];         // for "enrich" mode
}

export interface RawLead {
  fields: Partial<Record<LeadField, string>>;
  extended: Record<string, unknown>;
  sourceKind: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  fetchedAt: string;             // ISO 8601
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
```

Rules for all connectors:

1. Get all HTTP calls through one shared HTTP client. The client applies rate limits, retries, timeouts and SSRF protection (Section 17.2).
2. Send a User-Agent that identifies the app, for example `NiftyLeadsBot/1.0 (+https://leads.niftytechfinds.com/bot)`.
3. Return results as a stream (`AsyncIterable`). Do not wait for all pages.
4. Stop when `maxResults` is reached.
5. Record each call in `source_calls` (Source, status, time, cost). Do not record API keys.

### 9.2 Built-in connectors — free and open data (Phase 1A)

> Base URLs were correct on 17 October 2026. Read the provider documentation before you write each connector.

| Kind | Base URL | Fills | Notes |
|---|---|---|---|
| `osm_overpass` | `https://overpass-api.de/api/interpreter` (Admin can change) | Company Name, Website, Phone, Email, Location, Business Type | Main local-business Source for the Free Plan. Map Business Types to OSM tags (`shop`, `amenity`, `office`, `craft`, `healthcare`, `tourism`). The public instance asks for fewer than 10,000 queries and 1 GB each day, no parallel scripts, and a 30-second pause after HTTP 429. For commercial volume, the public instance asks for a self-hosted or paid instance. Show "© OpenStreetMap contributors" (ODbL). |
| `nominatim` | `https://nominatim.openstreetmap.org` | Location (geocode) | Converts location text to a bounding box. Maximum 1 request each second. No bulk geocoding. Cache all results. |
| `photon` | `https://photon.komoot.io` | Location (geocode) | Alternative geocoder. Can be self-hosted (Apache-2.0). |
| `website_enricher` | (the Lead website) | Email, Phone, Individual Name, Role, both LinkedIn URLs, Business Type hints | Rule-based on the Free Plan. AI extraction on the Paid Plan. See Section 11. |
| `wikidata` | `https://query.wikidata.org/sparql` | Company Name, Website, Company Linkedin URL, Industry, Location | SPARQL search for companies by industry and country. Find property IDs by label with the `wbsearchentities` API. Do not hard-code property IDs without a check. CC0 data. |
| `gleif` | `https://api.gleif.org/api/v1` | Company Name (legal), Location | Legal entities with LEI codes. Free. |
| `companies_house_uk` | `https://api.company-information.service.gov.uk` | Company Name, Location, officers (Individual Name, Role) | Free API key. UK only. |
| `sec_edgar` | `https://data.sec.gov` | Company Name, Location, Industry (SIC) | Free. US public companies. The User-Agent must include a contact email. |
| `github_orgs` | `https://api.github.com` | Company Name, Website, Location, Email (only if public) | Free token. Good for "software company" searches. |
| `hn_hiring` | `https://hn.algolia.com/api/v1` | Company Name, Website, Location | Companies in "Who is hiring" posts. Hiring is a buying signal. |
| `remotive` | `https://remotive.com/api/remote-jobs` | Company Name, Website, Industry | Companies that hire now. Attribution is required. |
| `arbeitnow` | `https://www.arbeitnow.com/api/job-board-api` | Company Name, Location | Companies that hire now (mainly Europe). |
| `data_gov_in` | `https://api.data.gov.in` | Company Name, Location, Industry | Free key. Indian Open Government Data. Check which company data sets exist before you write the connector. |
| `common_crawl_index` | `https://index.commoncrawl.org` | Company Website (discovery) | Finds pages on a domain without a live crawl. |

### 9.3 Built-in connectors — paid or freemium (Phase 1B)

The Admin adds the keys. Disable all paid connectors by default.

| Kind | Base URL | Fills | Notes |
|---|---|---|---|
| `google_places` | `https://places.googleapis.com/v1` | Company Name, Website, Phone, Location, Business Type | Places API (New). Use Text Search, then Place Details only for Leads that pass the filters. Always send a field mask. Since 1 March 2025, each SKU tier has its own monthly free cap (Essentials 10,000, Pro 5,000, Enterprise 1,000 events). Phone and website fields cost more. Request them only when the User selects those fields. Check the current Google price list. |
| `gosom_service` | Admin URL of a self-hosted `gosom/google-maps-scraper` (REST API `/api/v1/jobs`) | Company Name, Website, Phone, Email, Location, Business Type | Runs as a separate Docker service. See the CAUTION below. |
| `serpapi` | `https://serpapi.com/search.json` | Google Maps results, LinkedIn URLs (from search results) | Engines `google_maps` and `google`. |
| `serper` | `https://google.serper.dev` | Maps/places results, LinkedIn URLs | Endpoints `/search`, `/places`, `/maps`. |
| `searchapi_io` | `https://www.searchapi.io/api/v1/search` | Google Maps results, LinkedIn URLs | |
| `brave_search` | `https://api.search.brave.com/res/v1/web/search` | Company Website, LinkedIn URLs | About USD 5 for 1,000 queries, with USD 5 free credit each month (Brave, October 2026). |
| `searxng` | Admin URL of a self-hosted SearXNG | Company Website, LinkedIn URLs | Free if self-hosted. AGPL: run it unmodified as a separate service. |
| `geoapify_places` | `https://api.geoapify.com/v2/places` | Company Name, Website, Phone, Location, Business Type | OSM-based. Has a free plan. |
| `foursquare_places` | See Foursquare Places API documentation | Company Name, Website, Phone, Location, Business Type | Free tier, then paid. |
| `tomtom_search` / `here_search` | See provider documentation | Company Name, Phone, Website, Location | Freemium point-of-interest search. |
| `yelp_fusion` | `https://api.yelp.com/v3` | Company Name, Phone, Location, Business Type | Paid plans. Display rules apply. |
| `apify_actor` | `https://api.apify.com/v2` | Depends on the actor | The Admin enters an actor ID and an output field map. |
| `outscraper` | See provider documentation | Google Maps data, emails | Paid. |
| `firecrawl` | `https://api.firecrawl.dev` | Website text for AI extraction | Hosted API with a key. The source code is AGPL. Do not copy it. |
| `hunter` | `https://api.hunter.io/v2` | Email, Individual Name, Role, Person Linkedin URL | Domain Search, Email Finder, Email Verifier |
| `apollo` | `https://api.apollo.io/api/v1` | Individual Name, Role, both LinkedIn URLs, Email, Industry, company size | People and organization search and enrichment |
| `people_data_labs` | `https://api.peopledatalabs.com/v5` | Individual Name, Role, Person Linkedin URL, Industry, company size | Person and company enrichment |
| `snov` / `prospeo` / `dropcontact` | See provider documentation | Email, Individual Name, Role | Email finders |
| `verifier_zerobounce` / `verifier_neverbounce` / `verifier_millionverifier` | See provider documentation | `email_status` | Email verification |

> **CAUTION:** Google's terms do not permit scraping of Google Maps. The `gosom_service` connector and the SERP "maps" engines collect Google Maps data without the official API. Disable these connectors by default. Show the Admin a warning before the Admin enables them. The official `google_places` connector is the compliant option.

### 9.4 Generic REST connector

The Admin can add a new API without new code. The Admin writes a JSON config. Validate the config with Zod. Example:

```json
{
  "name": "My Places API",
  "kind": "generic_rest",
  "request": {
    "method": "GET",
    "url": "{{base_url}}/search",
    "query": { "q": "{{keyword}}", "near": "{{location.text}}", "limit": "{{page_size}}" },
    "headers": { "Authorization": "Bearer {{api_key}}" }
  },
  "pagination": { "type": "cursor", "cursorPath": "$.next", "param": "cursor", "maxPages": 5 },
  "resultsPath": "$.results[*]",
  "map": {
    "company_name": "$.name",
    "company_website": "$.website",
    "phone": "$.tel",
    "email": "$.email",
    "location": "$.address.formatted",
    "business_type": "$.category"
  },
  "extendedMap": { "latitude": "$.geo.lat", "longitude": "$.geo.lng", "rating": "$.rating" },
  "rateLimit": { "perMinute": 60, "perDay": 5000 },
  "cost": { "creditsPerCall": 1, "usdPerCall": 0.002 }
}
```

Rules:

1. Support pagination types: none, page number, offset, cursor and "next URL".
2. Support methods GET and POST (JSON body).
3. Use simple `{{variable}}` replacement for templates. Do not use `eval` or a template engine that runs code.
4. Use a JSONPath library with script evaluation disabled (for example `jsonpath-plus` with `eval: false`).
5. Send all requests through the SSRF-protected HTTP client (Section 17.2).
6. Show the mapped preview in "Test Source" (Section 8.2).

### 9.5 Rate limits and retries

1. Use one token-bucket rate limiter for each Source. Store the bucket state in Postgres, so more than one worker can share it.
2. Retry on HTTP 429, 500, 502, 503 and 504. Use exponential backoff with jitter. Maximum 3 retries.
3. Obey the `Retry-After` header.
4. For Overpass, wait 30 seconds after HTTP 429 or 406.
5. If a Source fails 5 times in a row, pause the Source for 15 minutes. Show the state in the Admin Jobs monitor.
6. Cache Source responses for 7 days (key: Source kind + normalized query). The Admin can change the cache time.

### 9.6 Do not use

1. Do not scrape LinkedIn. Do not log in to LinkedIn with automation. Get LinkedIn URLs only from company websites, search APIs, enrichment APIs, Wikidata or User imports.
2. Do not build on the Google Custom Search JSON API. Google closed it to new customers. It stops on 1 January 2027.
3. Do not use the Bing Search APIs. Microsoft retired them in August 2025.
4. Do not scrape IndiaMART, JustDial or other directories that forbid scraping in their terms.
5. Do not decode emails that a website protects on purpose (for example Cloudflare email protection).

---

## 10. Lead Run pipeline

### 10.1 Search wizard (User side)

The wizard has these steps. The User can go back to each step.

1. **Mode.** Find local businesses / Find companies (B2B) / Find people at companies / Enrich my sheet.
2. **What.** Keywords and Business Types (autocomplete from the Taxonomy). Industry filter. On the Paid Plan, the AI suggests more keywords (Section 12, task `query_expand`).
3. **Where.** Country, state, city (one or more), or a radius around a point, or a box drawn on a map. Use Leaflet with OSM tiles for the map.
4. **Who.** Target roles (multi-select plus free text). Company size (Paid only, if a Source gives it).
5. **Fields.** Checkboxes for the 12 output fields. For each field, select "must have" or "nice to have".
6. **Sources.** Checkboxes for the Sources that the Plan allows. Show the cost of each Source.
7. **Filters.** Exclude Leads already in my CRM. Exclude domains (list). Minimum lead score (Paid).
8. **Review.** Show the Credit estimate, the time estimate and a summary. The User clicks "Start Run".

### 10.2 Pipeline steps (worker side)

Make each step a pg-boss job. Make each job idempotent.

1. **Plan the Run.** Validate the query. Reserve Credits. Set the Run state to `queued`.
2. **Geocode.** Convert the location text to a bounding box and a center point. Cache the result.
3. **Tile.** For large areas, split the bounding box into tiles. This keeps each Source query small.
4. **Discover.** Query each selected Source in parallel. Each Source has its own rate limit. Write each RawLead to `raw_leads`.
5. **Normalize.** Clean each field (Section 13.1).
6. **Merge and dedupe.** Merge RawLeads into Leads (Section 13.2). Remove Leads that are already in the User's CRM, if the User selected this filter.
7. **Enrich.** Run the Website Enricher (Section 11). Then run the enrichment APIs for the fields that are still empty and that the User wants.
8. **AI steps (Paid).** Extract people and roles. Classify Business Type and Industry. Score each Lead (Section 12).
9. **Verify.** Verify emails, phones and websites (Section 13.4).
10. **Filter.** Remove Leads that do not have the "must have" fields. Remove Leads in the Suppression List.
11. **Save.** Save the Leads to the User's List. Charge Credits (Section 7.3).
12. **Report.** Make the Run Report (Section 6.1). Send an in-app notice. Send an email notice if the Run took more than 2 minutes.

### 10.3 Run states

`draft` → `queued` → `discovering` → `enriching` → `verifying` → `finalizing` → `done`

Other end states: `partial` (some Sources failed), `failed`, `cancelled`.

The User can cancel a Run. When the User cancels, stop new jobs. Keep the Leads that the app already saved. Charge only for these Leads.

### 10.4 Live progress

Show a progress page. Use Server-Sent Events. Show: the current step, the count of Leads found, the count of Leads saved, the fill rate of each field, and errors for each Source. Show the first 20 Leads while the Run continues.

---

## 11. Website Enricher

### 11.1 Crawl rules

1. Read `robots.txt` first. Obey it. If `robots.txt` blocks the path, do not get the page.
2. Get a maximum of 6 pages for each domain. Priority order: `/`, `/contact`, `/contact-us`, `/about`, `/about-us`, `/team`, `/our-team`, `/leadership`, `/impressum`. Also follow links whose text contains "contact", "about" or "team".
3. Timeout: 10 seconds for each page. Maximum page size: 2 MB. HTML only.
4. Maximum 2 parallel requests for each domain. Wait 1 second between requests to the same domain.
5. Do not submit forms. Do not log in. Do not open pages behind a login.
6. Use CheerioCrawler (static HTML) first. Use Playwright only on the Paid Plan, only if the page has no text, and only if the Admin enables it.

### 11.2 Rule-based extraction (Free and Paid)

1. **Email:** `mailto:` links. Email patterns in text. Simple text forms such as "name [at] domain [dot] com". HTML entities.
2. **Phone:** `tel:` links. Phone patterns near the words "phone", "call", "mobile", "tel". Parse with libphonenumber-js and the Lead country.
3. **JSON-LD:** Read `schema.org` types `Organization`, `LocalBusiness`, `Person`. Get name, email, telephone, address, `sameAs` links, `jobTitle`.
4. **Social links:** Find links to `linkedin.com/company/`, `linkedin.com/in/`, Facebook, Instagram, X, YouTube and `wa.me`.
5. **Meta:** `<title>`, `og:site_name`, `meta description` for `description`.
6. **People (Free Plan):** Use only JSON-LD `Person` data and simple patterns ("Name – Title" in team cards). If the pattern is not clear, leave the field empty.

### 11.3 AI extraction (Paid)

1. Convert the page HTML to clean text (remove scripts, styles, navigation and footers, but keep footer links).
2. Limit the text to 12,000 characters for each page.
3. Send the text to the `extract_contacts` AI task (Section 12).
4. Accept a person only if the AI returns an `evidence` quote that exists in the page text. Check this in code.
5. Cache the AI result by the hash of the page text.

---

## 12. AI (LLM) tasks

### 12.1 Task list

| Task | Input | Output (JSON) | Plan |
|---|---|---|---|
| `query_expand` | Keywords, Business Types, country | `{ keywords[], osm_tags[], google_types[] }` | Paid |
| `extract_contacts` | Page text, page URL, company name | `{ company{ name, email, phone, address }, people[{ name, role, email, phone, linkedin_url, evidence }] }` | Paid |
| `classify` | Company name, description, OSM tags, Google types | `{ business_type, industry, confidence }` (values must come from the Taxonomy) | Paid |
| `score` | Lead fields, Offer Profile (ideal customer) | `{ score 0–100, reasons[] (max 3) }` | Paid |
| `summarize` | Lead fields, page text | `{ summary }` (max 200 characters) | Paid |
| `write_draft` | Lead fields, Offer Profile, channel, Sequence step, language | `{ subject, body, personalization_facts[] }` | Paid |
| `rewrite_draft` | Draft, User instruction | `{ subject, body }` | Paid |

### 12.2 AI rules

1. Put each system prompt in `packages/ai/prompts/<task>.md`. Version each prompt.
2. Each system prompt must say: "Use only the facts in the input. If a fact is not in the input, return null."
3. Use temperature 0 for `extract_contacts`, `classify` and `score`.
4. Validate each output with a Zod schema. If the output is not valid, retry one time with the validation error in the message. If it fails again, skip the task for this Lead and log the error.
5. For `classify`, reject any value that is not in the Taxonomy.
6. For `write_draft`, each item in `personalization_facts` must exist in the Lead fields. Check this in code.
7. Count the tokens of each call. Write them to `ai_usage`. Stop AI tasks when the User or the LLM Provider reaches the budget.
8. Do not send the User's API keys, other Users' data or system secrets to the LLM.

### 12.3 JSON output with different providers

Providers support different JSON modes. Use this order when "JSON mode" is `auto`:

1. Send `response_format: { type: "json_schema", json_schema: {...} }`.
2. If the provider returns an error for this parameter, send `response_format: { type: "json_object" }`. Put the schema in the system prompt.
3. If the provider returns an error again, send no `response_format`. Ask for JSON only. Extract the first JSON object from the reply.
4. Remember the mode that works for each LLM Provider. Store it in the database.

---

## 13. Data quality

### 13.1 Normalize

| Field | Rule |
|---|---|
| Company Name | Trim. Collapse spaces. Decode HTML entities. Keep a separate `match_name` in lowercase without legal suffixes and punctuation. |
| Website | Add `https://` if missing. Remove `www.`, paths, query strings and tracking parameters for `company_domain`. Move social and directory URLs (facebook.com, instagram.com, linktr.ee, wa.me, justdial.com, indiamart.com, yelp.com, google.com/maps) to the social or extended fields. |
| Phone | Parse with libphonenumber-js. Use the Lead country, or the User country if the Lead country is unknown. Store E.164. Store the phone type. Discard numbers that are not valid. |
| Email | Lowercase. Trim. Remove `mailto:` and query strings. Discard image file names that look like emails (for example `logo@2x.png`). |
| LinkedIn URLs | Lowercase the host. Remove query strings, locale paths and tracking. Use the formats in Section 5.2. |
| Location | Build "City, State, Country" from address parts. Use the country name in English. |

### 13.2 Merge and dedupe

Use these match keys in this order:

1. `company_domain`
2. Phone (E.164)
3. `google_place_id` or `osm_id`
4. `match_name` + `postal_code`
5. `match_name` similarity of 0.90 or more (Jaro-Winkler) and a distance of 200 m or less

When two records match, merge them into one Lead. For each field, keep the value with the highest confidence. Keep all values in `field_sources`.

Dedupe people inside one company by `person_linkedin_url`, then by email, then by lowercase name.

### 13.3 Website check

Send one HEAD request (fall back to GET). Store the HTTP status in `website_status`. Follow a maximum of 5 redirects. If the final domain changes, store the final domain.

### 13.4 Email verification

| Level | Checks | Plan |
|---|---|---|
| Basic | Syntax (RFC 5322 subset), MX record (Node `dns.resolveMx`), disposable domain list, role-address list | Free and Paid |
| Full | Basic, plus SMTP mailbox check with a self-hosted Reacher service (`reacherhq/check-if-email-exists`), or a paid verifier from Section 9.3 | Paid |

> **CAUTION:** An SMTP mailbox check needs outbound port 25. Many cloud hosts block port 25. Run Reacher on a host that permits port 25, or use a paid verifier.

Set `email_status` to one of: `valid`, `invalid`, `risky`, `catch_all`, `unknown`.

### 13.5 Confidence

1. Start with the reliability of the Source (Admin setting, Section 8.2).
2. Add 0.1 for each other Source that gives the same value. The maximum is 1.0.
3. Set email confidence to 0.95 if `email_status` is `valid`. Set it to 0.2 if `email_status` is `invalid`.
4. Set confidence to 1.0 for values that the User imported or typed.
5. Show the confidence as a colored dot next to each value in the UI.

---

## 14. CRM

### 14.1 Features (Phase 1)

1. **Lists:** make, rename, merge, archive. A Lead can be in more than one List.
2. **Views:** table view (sort, filter, column select) and Kanban board by stage.
3. **Stages (default):** New → Contacted → Replied → Interested → Meeting Booked → Won → Lost → Do Not Contact. The User can rename and add stages.
4. **Lead detail page:** all fields, provenance and confidence, activity timeline, notes, tasks, Drafts, and an "Enrich again" button.
5. **Notes:** plain text with timestamps.
6. **Tasks:** title, due date, reminder. Show tasks due today on the dashboard.
7. **Tags:** free tags with colors.
8. **Custom fields:** text, number, date, select.
9. **Bulk actions:** add tag, change stage, move to List, export, delete, add to Sequence.
10. **Activity timeline:** Run found the Lead, field changes, Drafts made, messages sent, stage changes.
11. **Search:** full-text search on company name, person name, email, domain and notes (Postgres `tsvector`).
12. **Do Not Contact:** a Lead in this stage cannot get Drafts or messages. Add its email and phone to the User's Suppression List.

### 14.2 Phase 2 CRM features

1. Two-way sync with HubSpot, Zoho CRM, Pipedrive and Twenty.
2. Teams: more than one seat, Lead owner, shared Lists.
3. Public REST API with User API keys.
4. Google Sheets export.

---

## 15. Outreach

The AI uses the same LLM Provider settings from Section 8.1. Outreach is a Paid feature. The Free Plan gets merge-field templates without AI.

### 15.1 Phase 1: Drafts, review and manual send

1. **Offer Profile.** The User enters: business name, website, what the User sells, ideal customer, 3 value points, proof (case studies or numbers), call to action, sender name, signature, tone (friendly / formal / direct), language.
2. **Channels.** Cold email (subject and body), follow-up 1, follow-up 2, LinkedIn connection note (maximum 300 characters), WhatsApp message (maximum 500 characters), call script.
3. **Sequence builder.** The User selects the steps and the wait days. Default: email on day 0, follow-up 1 on day 3, follow-up 2 on day 7.
4. **Draft rules.** The email body has a maximum of 120 words. One call to action. No false claims. No invented facts. Each email includes an opt-out line.
5. **Review queue.** Each Draft has: Approve, Edit, Regenerate, Reject. The User can approve many Drafts at one time.
6. **Manual send helpers.**
   - Email: "Open in email app" (a `mailto:` link with subject and body) and "Copy".
   - WhatsApp: "Open WhatsApp" (`https://wa.me/<E.164 digits>?text=<url-encoded message>`).
   - LinkedIn: "Copy note" and "Open profile". The User sends the message manually.
7. **Mark as sent.** When the User marks a Draft as sent, log the activity. Change the stage to "Contacted". Make a task for the next Sequence step.
8. **Suppression.** Never make a Draft for a Lead in the Suppression List or in the "Do Not Contact" stage.

> **CAUTION:** Do not automate LinkedIn actions. Do not send bulk WhatsApp messages through unofficial APIs. These actions break the platform terms and can cause account bans.

### 15.2 Phase 2: User email APIs and automatic sending

1. **Email provider settings (User side).** Each User can add an email provider. Encrypt all keys.

   | Provider | Settings |
   |---|---|
   | Resend | API key, From address, verified domain |
   | SMTP | Host, port, user, password, TLS |
   | Brevo | API key |
   | SendGrid | API key |
   | Mailgun | API key, domain, region |
   | Amazon SES | Access key, secret, region |
   | Postmark | Server token |

2. **Provider interface.** Make one `EmailProvider` interface with `send()`, `verifyDomain()` and `parseWebhook()`. Add each provider as an adapter. Use `resend` and `nodemailer` npm packages.
3. **Domain check.** Show the SPF, DKIM and DMARC state of the sender domain. Block sending until the domain has SPF and DKIM.
4. **Send limits.** Daily cap for each mailbox (default 30). Warm-up: increase the cap by 5 each day up to the User limit. Random delay of 60–240 seconds between emails. Send only in the business hours of the Lead time zone.
5. **Required content.** A one-click unsubscribe link and the `List-Unsubscribe` and `List-Unsubscribe-Post` headers (RFC 8058). The sender's postal address in the footer. Gmail and Yahoo require one-click unsubscribe for bulk senders.
6. **Webhooks.** Process bounce and complaint events. On a hard bounce or a complaint, add the email to the Suppression List and stop the Sequence.
7. **Reply detection.** Use the provider inbound webhook or IMAP polling. On a reply, stop the Sequence, change the stage to "Replied" and notify the User.
8. **Tracking.** Open and click tracking is off by default. The User can enable it.
9. **Auto-send mode.** Off by default. If the User enables it, the app sends approved Sequence steps without more review. The AI never sends a Draft that the User did not approve at least as a template.
10. **WhatsApp (optional).** Use only the official WhatsApp Business Cloud API, with approved templates and opt-in.

---

## 16. WordPress publication (Phase 1D)

### 16.1 Hosting model

1. Host the app on a subdomain of the WordPress site, for example `leads.niftytechfinds.com`. This keeps the session cookie same-site, so browsers do not block it inside the embed.
2. The WordPress site shows the app on a normal page. Users stay on the WordPress domain.

### 16.2 WordPress plugin: "Nifty Leads Connector"

Put the plugin in `wordpress-plugin/nifty-leads-connector/`.

1. **License:** GPL-2.0-or-later (required for WordPress.org). The SaaS app can stay closed-source.
2. **Settings page** (Settings → Nifty Leads): App URL, shared secret, WordPress role or membership level → Plan map, embed height mode.
3. **Shortcodes:** `[nifty_leads]` (the app) and `[nifty_leads_pricing]` (the Plans table from the app API).
4. **Single sign-on flow:**
   1. A logged-in WordPress user opens the page.
   2. PHP makes a JWT with `firebase/php-jwt` (HS256, shared secret). Claims: `sub` (WordPress user ID), `email`, `name`, `plan`, `site`, `iat`, `exp` (60 seconds), `jti`.
   3. The page loads an iframe with `APP_URL/sso/wp?token=<jwt>`.
   4. The app verifies the signature, `exp` and `site`. The app stores `jti` and rejects a second use.
   5. The app finds or makes the User. The app sets the Plan. The app makes a session. The app opens `/app`.
5. **Not logged in:** show the WordPress login and register links, with a redirect back to the page.
6. **Plan sync:** send a signed webhook to `APP_URL/api/wp/plan-sync` when the plan of a user changes. Use these WordPress hooks:
   - WordPress core: `set_user_role`.
   - Paid Memberships Pro: `pmpro_after_change_membership_level`.
   - WooCommerce Subscriptions: `woocommerce_subscription_status_updated`.
7. **Iframe height:** the app sends `postMessage({ type: "nl:height", value })`. The plugin script checks the message origin, then sets the iframe height.
8. **App security headers:** for the `/app` and `/sso/wp` routes, set `Content-Security-Policy: frame-ancestors <WordPress origin>`. Do not set `X-Frame-Options: DENY` on these routes.
9. **WordPress standards:** use nonces, capability checks, `sanitize_*` and `esc_*` functions. Pass the "Plugin Check" plugin with no errors.

---

## 17. Security and compliance

### 17.1 Secrets

1. Encrypt all API keys and passwords in the database with AES-256-GCM. Use `APP_ENCRYPTION_KEY` from the environment (32 bytes, base64).
2. Store the IV, the auth tag, the ciphertext and a key version. Support key rotation.
3. Never send a secret to the browser. Show only the last 4 characters.
4. To change a secret, the Admin types a new value. The app never shows the old value.
5. Remove secrets from logs and error reports.

### 17.2 SSRF protection

The Admin and Users can enter URLs (Source base URLs, websites, webhooks). Protect the server:

1. Resolve the DNS name before you connect. Block private and reserved ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `0.0.0.0/8`, `::1`, `fc00::/7`, `fe80::/10`.
2. Check again after each redirect.
3. Permit only `http` and `https`.
4. Exception: an LLM Provider or Source with "Allow private network" on (self-hosted installs only).

### 17.3 App security

1. Validate all API input with Zod.
2. Check the role and the owner of each record on the server for each request.
3. Use row-level filters: a User can read only the User's own Leads, Lists and settings.
4. Rate-limit login, signup, Run start and export endpoints.
5. Use CSRF protection for forms. Use secure, HTTP-only cookies.
6. Run `npm audit` in CI. Fail CI on high-severity issues.

### 17.4 Compliance

> **CAUTION:** Names, work emails and phone numbers of people are personal data, also in B2B. Data-protection laws apply: GDPR (EU and UK), CAN-SPAM (US), and the Indian DPDP Act 2023. The DPDP Rules 2025 apply in phases. The notice, consent, security and data-principal-rights rules apply from 13 May 2027. Get legal advice before launch.

1. Store the Source and the collection date of each value (`field_sources`).
2. Show the required attribution for each Source (for example OSM ODbL).
3. Obey `robots.txt` and the terms of each Source.
4. Do not collect sensitive personal data (health, religion, politics, and similar).
5. Give each Lead a "Delete and suppress" action. This deletes the data and adds the email and phone to the Suppression List.
6. Make a public "Remove my data" page. A person enters an email or phone. The app sends a confirmation code. Then the app deletes the matching Leads in all accounts and adds the value to the global Suppression List.
7. Publish a privacy notice and terms of use. Include: the data you collect, the purposes, the Sources, how to withdraw, and how to complain.
8. Users must accept the terms. The terms say that the User is responsible for lawful outreach.

---

## 18. Phases and acceptance criteria

### Phase 0 — Project setup

Tasks:
1. Make a monorepo: `apps/web` (Next.js), `apps/worker` (Node.js), `packages/db`, `packages/sources`, `packages/ai`, `packages/core`, `wordpress-plugin/`.
2. Add Docker Compose with `web`, `worker` and `postgres`.
3. Add Drizzle, the first migration and seed data (Plans, Taxonomy, default Sources).
4. Add Better Auth with email OTP. Add the `admin` and `user` roles. Read `ADMIN_EMAILS`.
5. Add the System email setting (Section 8.5).
6. Add the encryption helper (Section 17.1) and the SSRF-protected HTTP client (Section 17.2), with tests.
7. Add CI: type check, lint, unit tests, `npm audit`.
8. Make `AGENTS.md` and `.env.example`.

Done when:
- `docker compose up` starts all services with no errors.
- The Admin gets a login code by email and opens the Admin pages.
- A normal User cannot open the Admin pages (test).
- The SSRF tests block all ranges of Section 17.2.

### Phase 1A — Free core

Tasks:
1. Lead, List, Run, RawLead, Credit and Source tables.
2. Source Connector interface (Section 9.1) and the free connectors of Section 9.2. Start with `osm_overpass`, `nominatim`, `website_enricher` and `wikidata`.
3. Search wizard (Section 10.1), Run pipeline (Section 10.2) and live progress (Section 10.4).
4. Normalize, merge, dedupe and basic email verification (Section 13).
5. Lead table and Lead detail page.
6. Template Export (XLSX and CSV), Extended Export, Run Report (Section 6).
7. Plan limits and Credits (Section 7). Free Plan abuse control (Section 7.4).
8. Admin pages: Lead Sources, Plans and Credits, Taxonomy, Users, Jobs monitor, Audit log.

Done when:
- A Free User searches "dentist" in "Pune, Maharashtra, India" with 25 results. The Run finishes in less than 5 minutes.
- The XLSX export opens in Excel. Row 1 is equal to the 12 template headers in Section 5.1 (automated test).
- The Phone Number cells keep the "+" in Excel.
- Sr. No. goes from 1 to the row count.
- A second identical Run does not make duplicate Leads.
- The Run Report shows the fill rate of each of the 12 columns.

### Phase 1B — Paid core

Tasks:
1. LLM Providers page with presets, test button and task router (Section 8.1).
2. AI tasks of Section 12 with Zod validation and JSON-mode fallback.
3. Paid connectors: `google_places`, `serper`, `brave_search`, `hunter`, `apollo`, `generic_rest`, `gosom_service` (disabled by default).
4. Full email verification (Reacher service or paid verifier).
5. "Enrich my sheet" import (Section 6.3).
6. Usage and cost page (Section 8.8).

Done when:
- The Admin adds an OpenRouter key and an Ollama URL. "Test connection" works for both.
- A Paid Run fills Individual Name and Role from a team page. Each person has an evidence quote that exists in the page (automated test with a fixture).
- `classify` never returns a value outside the Taxonomy (test).
- The Admin adds a new API with `generic_rest` JSON only. "Test Source" shows mapped fields.
- An uploaded template file with empty Email cells comes back with emails filled where Sources had them. The imported values do not change.

### Phase 1C — CRM and outreach Drafts

Tasks:
1. CRM features of Section 14.1.
2. Offer Profile, Sequence builder, AI Drafts, review queue and manual send helpers (Section 15.1).
3. User and global Suppression Lists.

Done when:
- The User moves a Lead on the Kanban board. The activity timeline shows the change.
- The AI makes Drafts for 20 Leads. Each Draft uses only facts from the Lead (test).
- "Open WhatsApp" opens a valid `wa.me` link with the message.
- A Lead in "Do Not Contact" cannot get a Draft (test).

### Phase 1D — WordPress bridge

Tasks:
1. The WordPress plugin of Section 16.2.
2. The `/sso/wp` route, the plan-sync webhook and the frame headers in the app.
3. A test WordPress site in Docker Compose (profile `wp`) for end-to-end tests.

Done when:
- A logged-in WordPress user opens the page and sees the app without a second login.
- A token used a second time fails (test).
- A membership change in WordPress changes the Plan in the app in less than 1 minute.
- The plugin passes "Plugin Check" with no errors.

### Phase 2 — Sending and growth

Tasks:
1. User email providers and the sending engine (Section 15.2).
2. Reply detection and webhooks.
3. Payments: Razorpay and Stripe adapters (if the Plan source is `internal`).
4. Scheduled Runs (weekly refresh of a saved search).
5. CRM sync, teams, public API, Google Sheets export (Section 14.2).

Done when:
- A User connects Resend, verifies the domain and sends a 3-step Sequence to a test inbox.
- A reply stops the Sequence.
- A hard bounce adds the email to the Suppression List.
- Each email has working one-click unsubscribe headers.

---

## 19. GitHub references (checked on 17 October 2026)

### 19.1 Use as libraries (permissive licenses)

| Repository | License | Use |
|---|---|---|
| `apify/crawlee` | Apache-2.0 | Website crawl (Section 11) |
| `catamphetamine/libphonenumber-js` | MIT | Phone parse and format |
| `openai/openai-node` | Apache-2.0 | OpenAI-compatible LLM client with custom `baseURL` |
| `vercel/ai` | Apache-2.0 | Optional LLM layer with an OpenAI-compatible provider |
| `timgit/pg-boss` | MIT | Postgres job queue |
| `drizzle-team/drizzle-orm` | Apache-2.0 | ORM and migrations |
| `better-auth/better-auth` | MIT | Auth with email OTP |
| `colinhacks/zod` | MIT | Validation |
| `shadcn-ui/ui` | MIT | UI components |
| `exceljs/exceljs` | MIT | XLSX export (stable, last commit January 2024) |
| `disposable-email-domains/disposable-email-domains` | CC0-1.0 | Disposable domain list |
| `resend/resend-node` | MIT | Phase 2 email |
| `nodemailer/nodemailer` | MIT | Phase 2 SMTP |
| `firebase/php-jwt` | BSD-3-Clause | WordPress single sign-on |
| `wpbp/wordpress-plugin-boilerplate-powered` | GPL-3.0 | WordPress plugin start (GPL is correct for the plugin only) |

### 19.2 Run as separate services (the Admin adds the base URL)

| Repository | License | Use |
|---|---|---|
| `gosom/google-maps-scraper` | MIT | Google Maps extraction with a REST API and website email extraction. See the CAUTION in Section 9.3. |
| `omkarcloud/google-maps-scraper` | MIT | Alternative Google Maps scraper (Python). Same CAUTION. |
| `reacherhq/check-if-email-exists` | MIT | SMTP email verification service |
| `buyukakyuz/email-sleuth` | MIT | Email finder and verifier from name and domain |
| `searxng/searxng` | AGPL-3.0 | Self-hosted metasearch for website and LinkedIn URL discovery. Run unmodified. |
| `komoot/photon` | Apache-2.0 | Self-hosted geocoder |
| `osm-search/Nominatim` | GPL-3.0 | Self-hosted geocoder. Run unmodified. |
| `drolbr/Overpass-API` | AGPL-3.0 | Self-hosted Overpass for commercial volume. Run unmodified. |
| `unclecode/crawl4ai` | Apache-2.0 | Optional Python crawler that makes LLM-ready text |

### 19.3 Read for design ideas only (do not copy code)

| Repository | License | What to learn |
|---|---|---|
| `asiifdev/business-leads-ai-automation` (Prospex) | AGPL-3.0 | The closest reference: Next.js + NestJS + Postgres, Google Maps leads, AI Drafts, outbox review |
| `eracle/OpenOutreach` | GPL-3.0 | ICP-based AI qualification with reasons for each lead |
| `twentyhq/twenty` | AGPL-3.0 | Modern CRM data model and UX |
| `espocrm/espocrm`, `salesagility/SuiteCRM` | AGPL-3.0 | CRM features and pipelines |
| `krayin/laravel-crm` | MIT | CRM features (permissive license) |
| `mautic/mautic` | GPL-3.0 | Sequences and marketing automation |
| `knadh/listmonk` | AGPL-3.0 | Bulk sending, bounce handling (Phase 2) |
| `firecrawl/firecrawl` | AGPL-3.0 | Web page to LLM-ready text |
| `ScrapeGraphAI/Scrapegraph-ai` | MIT | LLM extraction patterns |
| `laramies/theHarvester` | GPL-2.0 | Email and domain discovery ideas |
| `Othmane-Khadri/YALC-the-GTM-operating-system` | MIT | GTM agent orchestration |
| `filip-michalsky/SalesGPT` | MIT | AI sales message prompts (last commit September 2024) |
| `kaymen99/sales-outreach-automation-langgraph` | No license file | Ideas only. No license means you cannot copy the code. |

### 19.4 Do not use

LinkedIn scrapers (for example `cullenwatson/StaffSpy`, `kiryano/Scout`). LinkedIn terms forbid scraping. This creates legal risk for a commercial product.

---

## 20. Appendix — pages, API routes and tables

### 20.1 Pages

- **Public:** `/` (landing), `/pricing`, `/login`, `/privacy`, `/terms`, `/remove-my-data`, `/bot` (crawler information).
- **User:** `/app` (dashboard), `/app/search/new` (wizard), `/app/runs`, `/app/runs/[id]` (progress and report), `/app/leads`, `/app/leads/[id]`, `/app/lists`, `/app/crm` (Kanban), `/app/outreach/profile`, `/app/outreach/sequences`, `/app/outreach/review`, `/app/import`, `/app/exports`, `/app/usage`, `/app/settings`, `/app/settings/email` (Phase 2).
- **Admin:** `/admin`, `/admin/users`, `/admin/plans`, `/admin/llm`, `/admin/sources`, `/admin/taxonomy`, `/admin/system-email`, `/admin/compliance`, `/admin/usage`, `/admin/jobs`, `/admin/audit`, `/admin/wordpress`.

### 20.2 API routes (REST, JSON)

- `POST /api/runs/estimate`, `POST /api/runs`, `GET /api/runs/:id`, `GET /api/runs/:id/events` (SSE), `POST /api/runs/:id/cancel`
- `GET /api/leads`, `GET /api/leads/:id`, `PATCH /api/leads/:id`, `POST /api/leads/bulk`, `POST /api/leads/:id/enrich`
- `POST /api/exports` (type, filters, columns), `GET /api/exports/:id/download`
- `POST /api/imports`, `GET /api/imports/:id`
- `GET|POST|PATCH|DELETE /api/lists`, `/api/notes`, `/api/tasks`, `/api/tags`
- `POST /api/drafts/generate`, `PATCH /api/drafts/:id`, `POST /api/drafts/:id/mark-sent`
- `GET|POST|PATCH|DELETE /api/admin/llm-providers`, `POST /api/admin/llm-providers/:id/test`
- `GET|POST|PATCH|DELETE /api/admin/sources`, `POST /api/admin/sources/:id/test`
- `GET|POST|PATCH /api/admin/plans`, `/api/admin/taxonomy`, `/api/admin/users`, `/api/admin/suppression`
- `GET /sso/wp`, `POST /api/wp/plan-sync`
- Phase 2: `POST /api/webhooks/email/:provider`, `GET /u/:token` (unsubscribe), `POST /u/:token` (one-click)

### 20.3 Database tables

`users`, `sessions`, `plans`, `subscriptions`, `credit_ledger`, `llm_providers`, `ai_task_routes`, `ai_usage`, `sources`, `source_calls`, `source_cache`, `rate_buckets`, `runs`, `raw_leads`, `leads`, `lead_people`, `lists`, `list_leads`, `stages`, `tags`, `lead_tags`, `custom_fields`, `custom_field_values`, `notes`, `tasks`, `activities`, `offer_profiles`, `sequences`, `sequence_steps`, `drafts`, `suppression_entries`, `taxonomy_business_types`, `taxonomy_industries`, `exports`, `imports`, `audit_log`, `wp_sso_jti`, `settings`.
Phase 2: `email_providers`, `mailboxes`, `messages`, `email_events`.

---

## 21. `.env.example`

```bash
# App
APP_URL=https://leads.niftytechfinds.com
APP_NAME="Nifty Leads"
NODE_ENV=production

# Database
DATABASE_URL=postgres://user:password@postgres:5432/niftyleads

# Security
APP_ENCRYPTION_KEY=          # 32 random bytes, base64
AUTH_SECRET=                 # random string, 32+ characters
ADMIN_EMAILS=                # comma-separated emails that get the admin role

# WordPress bridge
WP_SITE_ORIGIN=https://niftytechfinds.com
WP_SSO_SHARED_SECRET=        # same value as in the WordPress plugin

# Worker
WORKER_CONCURRENCY=4

# Note: LLM keys, Source keys and email keys are NOT environment variables.
# The Admin enters them in Admin Settings. The app encrypts them in the database.
```

---

## 22. Final report for each phase

At the end of each phase, give the owner:

1. A list of the features that you made.
2. The commands to run and test the app.
3. The test result (count of tests passed and failed).
4. The new environment variables, if any.
5. The open questions from `docs/QUESTIONS.md`.
6. The known limits and risks.
