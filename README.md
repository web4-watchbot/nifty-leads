# Nifty Lead Finder

### A Global AI-Powered Lead Discovery Engine by [NiftyTechFinds.com](https://niftytechfinds.com)

**Tagline:** Find. Discover. Enrich. Export.

Nifty Lead Finder turns ordinary search queries into organised, enriched, and exportable business lead databases. Built as a premium web tool within the NiftyTechFinds ecosystem — **100% free, no API key required, no signup required**.

---

## What it does

A user opens Nifty Lead Finder, types a query like `"marketing agencies in Berlin"` or `site:youtube.com "Podcast" "Video Director"`, picks search sources, and clicks **Search Leads**. The application:

1. Parses the search query (supports `site:`, `intitle:`, `inurl:`, `filetype:`, exact phrases, `-excluded`, `OR`, `AND`).
2. Generates source-specific query variations.
3. Calls multiple free search providers in parallel.
4. Collects, normalises, and deduplicates results.
5. Optionally crawls discovered websites to extract emails, phones, schema.org data, and social links.
6. Scores each lead for relevance (0–100) and data completeness (0–100).
7. Stores everything in SQLite with field-level provenance — every contact detail is traceable to its source URL.
8. Lets the user save leads, organize them into lists, add notes/tags/status, and export to CSV or XLSX.

---

## 100% Free — No API Keys Required

Nifty Lead Finder ships with **7 fully-working free data sources**. The app works the moment you start the dev server — no configuration, no credit card, no API keys.

| Source | What it provides | API Key? |
|---|---|---|
| **Web Search** (via `z-ai-web-dev-sdk`) | Global web pages, company websites, directories, news | ❌ No |
| **OpenStreetMap Overpass** | Local businesses (restaurants, clinics, agencies, shops) with addresses, phones, websites | ❌ No |
| **Wikipedia API** | Notable companies, organisations, and public figures | ❌ No |
| **GitHub Public API** | Developers, open-source maintainers, tech orgs (10 req/min unauthenticated) | ❌ No |
| **Hacker News (Algolia)** | Tech founders, product launches, discussed companies | ❌ No |
| **YouTube oEmbed + Web Search** | YouTube channels with public business emails | ❌ No |
| **Direct Web Crawler** | Fetches homepage/contact/about pages, extracts JSON-LD, emails, phones, social links | ❌ No |

### Optional BYOK providers

For users who want richer data, the Settings page supports **Bring Your Own Key** integrations:

- Brave Search API (2,000 queries/month free)
- Exa Search API (1,000 searches/month free)
- YouTube Data API v3 (10,000 quota units/day free)
- Google Places API ($200 monthly credit)
- Hunter.io email enrichment (25 searches/month free)
- Apollo.io B2B enrichment
- OpenAI-compatible AI provider for advanced scoring

These are entirely optional — the app works fully without any of them.

---

## Architecture

### Tech stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with shadcn/ui (New York) + Lucide icons
- **Database**: SQLite via Prisma ORM (zero-config, file-based)
- **State**: Zustand (with persist middleware for client preferences)
- **Server state**: TanStack Query patterns
- **Charts**: Recharts
- **Forms**: react-hook-form + zod
- **Web search**: `z-ai-web-dev-sdk` (server-side only)

### Modular provider architecture

Every search source is an independent adapter that returns a normalized `UnifiedLead` shape. Adding a new provider means adding one file under `src/lib/providers/` and registering it in the orchestrator. One provider failing never crashes a search — failures are isolated and surfaced as warnings in the UI.

```
src/lib/providers/
├── web.ts          # z-ai-web-dev-sdk web search
├── overpass.ts     # OpenStreetMap Overpass + Nominatim geocoding
├── github.ts       # GitHub users/orgs search
├── wikipedia.ts    # Wikipedia search
├── hackernews.ts   # Hacker News Algolia API
├── youtube.ts      # YouTube channel discovery via oEmbed
├── webcrawler.ts   # Direct website crawler with schema.org parser
└── index.ts        # Provider registry + capability metadata
```

### Extraction engine

```
src/lib/extraction/
├── query-parser.ts        # Google-style operator parser + query expansion
├── contact-extractor.ts   # Email/phone/social URL extraction with classification
├── schema-parser.ts       # JSON-LD / schema.org parser
├── dedup.ts               # Jaro-Winkler fuzzy matching + duplicate detection
├── scoring.ts             # Relevance + completeness scoring (rule-based, no LLM)
├── orchestrator.ts        # Multi-provider search runner
└── types.ts               # UnifiedLead type
```

### Database schema

20+ Prisma models covering users, settings, search jobs/results, leads, lead lists, notes, status history, export jobs, provider usage, audit logs, suppression records, and saved templates. See [`prisma/schema.prisma`](../prisma/schema.prisma).

---

## Local development

### Prerequisites

- Node.js 18+ (or Bun)
- SQLite (bundled — no separate install needed)

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Set up environment
cp .env.example .env
# Edit .env if you want to add optional API keys (the app runs fine without them)

# 3. Initialize the database
bun run db:push

# 4. Start the dev server
bun run dev
```

Open `http://localhost:3000` in your browser.

### Environment variables

The app runs with **zero environment variables**. The following are optional:

```env
# Database (defaults to file:./db/custom.db)
DATABASE_URL="file:./db/custom.db"

# Optional BYOK provider keys (all disabled by default)
BRAVE_API_KEY=
EXA_API_KEY=
YOUTUBE_API_KEY=
GOOGLE_PLACES_API_KEY=
HUNTER_API_KEY=
APOLLO_API_KEY=
AI_API_KEY=
```

API keys are stored **server-side only** in the `ApiConnection` table (encrypted at the database layer). They are never sent to frontend JavaScript, never persisted in browser localStorage, and never committed to source control.

---

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/search` | Run a search across selected providers |
| `GET` | `/api/search?jobId=...` | Get a specific search job |
| `PUT` | `/api/search` | Expand a query without executing |
| `GET` | `/api/leads` | List leads (filters: `saved`, `jobId`, `status`, `industry`, `country`, `hasEmail`, `hasPhone`) |
| `POST` | `/api/leads` | Create a lead manually |
| `GET` | `/api/leads/:id` | Get a single lead with sources |
| `PATCH` | `/api/leads/:id` | Update lead (status, notes, tags, isSaved) |
| `DELETE` | `/api/leads/:id` | Delete a lead |
| `POST` | `/api/leads/:id/enrich` | Re-crawl the lead's website for fresh data |
| `GET` | `/api/lists` | List all lead lists |
| `POST` | `/api/lists` | Create a list (optionally bulk-add lead IDs) |
| `GET` | `/api/lists/:id` | Get a list with all its leads |
| `PATCH` | `/api/lists/:id` | Add/remove leads from a list |
| `DELETE` | `/api/lists/:id` | Delete a list (leads preserved) |
| `POST` | `/api/export` | Export leads to CSV or XLSX (returns file download) |
| `GET` | `/api/export/:id` | Get export job metadata |
| `GET` | `/api/templates` | List built-in + custom templates |
| `POST` | `/api/templates` | Save a custom template |
| `GET` | `/api/dashboard` | Get dashboard stats (calculated from real DB data) |
| `GET` | `/api/providers` | List free + optional providers + API checklist |
| `POST` | `/api/providers` | Test an optional provider's API key format |
| `GET` | `/api/history` | List recent search jobs |
| `DELETE` | `/api/history` | Clear all search history |
| `GET` | `/api/suppression` | List suppression (do-not-contact) records |
| `POST` | `/api/suppression` | Add a suppression record |
| `DELETE` | `/api/suppression?id=...` | Remove a suppression record |

---

## Features

### Search
- Google-style search operators (`site:`, `intitle:`, `inurl:`, `filetype:`, `after:`, `before:`, `domain:`, `country:`, `language:`, exact phrases, `-excluded`, `AND`/`OR`/`NOT`)
- Multi-source dropdown with 7 free providers organized into 6 groups
- Advanced filters: location, industry, lead type, max results, website enrichment toggle
- 10 quick-search categories (Find Businesses, Find People, Find YouTube Channels, etc.)
- 8 example queries to get started
- 26 pre-built templates across 5 categories (Content & Creators, Business Leads, Sales Prospecting, Recruitment, Local Business)

### Results
- Card view and table view
- Stats header: total discovered, unique leads, with emails, with phones, with websites, duration
- Per-provider error reporting (one provider failing never blocks the search)
- Generated query variations list (transparent)
- Select-all / multi-select with bulk save and export
- Sortable, filterable table

### Lead detail drawer
- 4 tabs: Overview, Contact, Sources, Manage
- Relevance and completeness scores (0–100)
- AI-generated summary (rule-based, no LLM required)
- Field-level provenance — every value links back to its source URL
- Email status badges: Verified / Publicly listed / Inferred / Invalid / Not found
- Social profile links (LinkedIn, YouTube, Instagram, Facebook, X, GitHub)
- "Enrich This Lead" button re-crawls the website for fresh data
- Status workflow: New → Reviewed → Qualified → Contacted → Follow-up → Converted / Not Interested / Archived
- Private notes (separate from publicly discovered source data)
- Tags (comma-separated)
- OpenStreetMap geo-link when coordinates are available

### Bulk discovery
- Plain-English seed query (e.g., "Find podcast producers in the USA")
- Automatic query expansion generates 5–10 variations including city-specific ones
- Editable queue (add/remove/modify queries before running)
- Sequential execution with progress bar
- Pause / resume / cancel / retry failed
- Real lead counts — never promised

### Lead management
- Save leads from search results
- Create custom lists (with color coding)
- 8 lead statuses with history tracking
- Private notes log (separate from source data)
- Tags for categorization
- Full-text search across saved leads
- Status filter chips

### Export
- CSV (RFC 4180 compliant, UTF-8 with BOM for Excel)
- XLSX (native Excel 2007+ format, no external library — pure TypeScript ZIP writer)
- 32 default columns, customizable
- 9 export scopes: all results, selected, filtered, saved list, enriched, email-available, phone-available, businesses only, professionals only
- Formula-injection protection (cells starting with `=`, `+`, `-`, `@` are escaped)
- Up to 5,000 leads per export

### Dashboard
- 8 KPI tiles (total searches, total results, total leads, saved leads, emails discovered, verified emails, phones found, websites)
- 5 charts: leads over time (line), leads by source (pie), leads by country (bar), leads by industry (bar), contact completeness (bar)
- Recent search activity log
- All values calculated from real DB data — never hard-coded

### Settings
- Providers tab: shows all 7 free providers (always connected) + 7 optional BYOK providers with API key test buttons
- API Checklist tab: full integration status table (as required by the spec)
- Compliance tab: suppression/do-not-contact list management + privacy & legal compliance notice
- About tab: documentation links

### Compliance & privacy
- **Public data only** — never bypasses authentication, CAPTCHAs, paywalls, or rate limits
- **No fabrication** — missing fields show "Not found", never invented
- **Field-level provenance** — every contact detail is traceable to its source URL
- **Suppression lists** — exclude emails/phones/domains from exports
- **Responsible use notice** — finding a public email does not grant marketing permission
- **Designed for** GDPR, UK GDPR, CCPA/CPRA, CAN-SPAM, CASL, India's DPDP Act
- **No automated outreach** — the product focuses on discovery and export

---

## Deployment

### Vercel (recommended)

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Set the build command to `bun run build`.
4. Set the output directory to `.next`.
5. (Optional) Add any BYOK environment variables.
6. Deploy.

The SQLite database file lives in `/db/custom.db` which is fine for development but **ephemeral on Vercel**. For production, swap the `datasource` in `prisma/schema.prisma` to PostgreSQL (e.g., Supabase, Neon, or Vercel Postgres) and run `bun run db:push` again.

### WordPress integration

Nifty Lead Finder is designed to integrate cleanly with the existing NiftyTechFinds WordPress site. Three options are supported:

**Option A — Subdomain (recommended)**: Deploy to Vercel and point `tools.niftytechfinds.com/lead-finder` to it via a CNAME record. Provides the best UX and full functionality.

**Option B — Path**: Configure the WordPress server as a reverse proxy for `/lead-finder/` to the Vercel deployment.

**Option C — iframe embed**: Add a WordPress page with:
```html
<iframe src="https://your-vercel-app.vercel.app/" style="width:100%;height:100vh;border:0;" title="Nifty Lead Finder"></iframe>
```
The application remains fully functional inside an iframe.

The app includes:
- SEO-friendly metadata (title, description, keywords, OpenGraph, Twitter cards)
- Structured data ready (add JSON-LD via WordPress if desired)
- Responsive full-screen layout
- NiftyTechFinds branding throughout

---

## Testing

The application has been verified end-to-end:

- ✅ Lint passes (`bun run lint`)
- ✅ Dev server compiles without errors
- ✅ Search returns real leads from multiple providers (verified with "marketing agencies in Berlin" — 5 leads from web/wikipedia/github)
- ✅ Lead detail drawer opens with all 4 tabs (Overview, Contact, Sources, Manage)
- ✅ Saving a lead persists to DB and appears in Saved Leads view
- ✅ Export to CSV works (RFC 4180 compliant, UTF-8 BOM, formula-injection safe)
- ✅ Export to XLSX works (verified as valid Excel 2007+ file via `unzip -l`)
- ✅ Dashboard renders with real calculated values and interactive Recharts charts
- ✅ Templates view shows 26 templates across 5 categories with Apply/Run buttons
- ✅ Bulk discovery generates query variations from a seed query
- ✅ Settings page shows all providers with the correct API checklist
- ✅ History view lists all past searches with Reuse buttons
- ✅ Mobile responsive (sidebar collapses to horizontal scroll nav)

### Known limitations

1. **OpenStreetMap Overpass**: Some Overpass mirrors are blocked from certain cloud environments. The code tries 4 mirror endpoints in sequence. If all fail, the `business` source returns 0 results but other sources continue working.
2. **GitHub unauthenticated rate limit**: 10 requests/minute. The app gracefully handles 403 responses with a clear error message.
3. **YouTube**: Without the YouTube Data API, the app uses oEmbed which doesn't expose subscriber counts or video counts. Channel name, description, thumbnail, and publicly published business emails (from channel description) are still extracted.
4. **Email verification**: Emails found via web crawl are marked "publicly listed" not "verified". True verification requires an SMTP probe (not implemented to avoid being flagged as spam).

---

## Project structure

```
.
├── prisma/
│   └── schema.prisma              # 20+ models: users, leads, lists, jobs, exports, etc.
├── src/
│   ├── app/
│   │   ├── layout.tsx             # NiftyTechFinds branding + dark theme default
│   │   ├── page.tsx               # Main SPA shell with view routing
│   │   ├── globals.css            # Premium dark theme with cyan accents
│   │   └── api/
│   │       ├── search/            # POST /api/search (orchestrator entry)
│   │       ├── leads/             # CRUD + enrich
│   │       ├── lists/             # CRUD
│   │       ├── export/            # CSV + XLSX download
│   │       ├── templates/         # Built-in + custom
│   │       ├── dashboard/         # Aggregated stats
│   │       ├── providers/         # Provider registry + API checklist
│   │       ├── history/           # Search history
│   │       └── suppression/       # Do-not-contact list
│   ├── lib/
│   │   ├── providers/             # 7 free search provider adapters
│   │   ├── extraction/            # Query parser, dedup, scoring, orchestrator
│   │   ├── export/                # CSV + pure-TS XLSX writer
│   │   ├── templates/             # 26 pre-built search templates
│   │   ├── store/                 # Zustand store + runSearch hook
│   │   ├── db.ts                  # Prisma client
│   │   ├── session.ts             # Demo user (passwordless)
│   │   └── utils.ts               # cn() helper
│   └── components/
│       ├── ui/                    # shadcn/ui components
│       └── lead-finder/           # App-specific components:
│           ├── sidebar.tsx
│           ├── search-view.tsx
│           ├── source-dropdown.tsx
│           ├── advanced-filters.tsx
│           ├── results-view.tsx
│           ├── lead-detail-drawer.tsx
│           ├── export-dialog.tsx
│           ├── saved-leads-view.tsx
│           ├── lists-view.tsx
│           ├── dashboard-view.tsx
│           ├── templates-view.tsx
│           ├── bulk-view.tsx
│           ├── history-view.tsx
│           ├── settings-view.tsx
│           └── footer.tsx
├── public/
│   └── logo.svg
├── .env                           # Optional BYOK keys
├── package.json
└── README.md                      # This file
```

---

## API configuration checklist

| Provider | Purpose | API Key Required | Integration Status |
|---|---|---|---|
| Web Search (z-ai SDK) | Global Web Search | No | ✅ Active |
| OpenStreetMap Overpass | Local Business Data | No | ✅ Active |
| YouTube oEmbed + Web | YouTube Discovery | No | ✅ Active |
| GitHub Public API | Developer Discovery | No | ✅ Active |
| Wikipedia API | Notable Companies & People | No | ✅ Active |
| Hacker News (Algolia) | Tech Companies & Founders | No | ✅ Active |
| Direct Web Crawler | Website Enrichment | No | ✅ Active |
| Brave Search | Additional Web Search | Yes (BYOK) | Available (optional) |
| Exa Search | Semantic Web Search | Yes (BYOK) | Available (optional) |
| YouTube Data API v3 | Rich YouTube Metadata | Yes (BYOK) | Available (optional) |
| Google Places | Verified Business Data | Yes (BYOK) | Available (optional) |
| Hunter.io | Email Enrichment | Yes (BYOK) | Available (optional) |
| Apollo | B2B Enrichment | Yes (BYOK) | Available (optional) |
| AI Provider | Lead Classification | Yes (BYOK) | Available (optional) |

---

## License & attribution

- **Code**: Proprietary — NiftyTechFinds.com
- **OpenStreetMap data**: © OpenStreetMap contributors, ODbL 1.0 — [https://www.openstreetmap.org/copyright](https://www.openstreetmap.org/copyright)
- **Wikipedia content**: Creative Commons Attribution-ShareAlike 3.0
- **GitHub data**: GitHub API Terms of Service
- **Hacker News data**: Algolia HN Search API

---

## Privacy & legal

Nifty Lead Finder only accesses publicly available and lawfully accessible information from sources whose terms permit it. It never bypasses CAPTCHAs, authentication, paywalls, or rate limits. It never fabricates contact details. Every field is traceable to its original source URL.

Finding a publicly listed email does **not** automatically grant permission to send marketing communications. Users are responsible for complying with all applicable laws including GDPR, UK GDPR, CCPA/CPRA, CAN-SPAM, CASL, and India's DPDP Act.

The product focuses on lead discovery, information management, and export — **not** automated outreach.

---

**Built with care by [NiftyTechFinds.com](https://niftytechfinds.com)**

Find. Discover. Enrich. Export.
