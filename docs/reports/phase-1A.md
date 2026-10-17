# Phase 1A Report — Free Core

## Features made

**Core (packages/core):**
- `normalize.ts` (Section 13.1): company name (display + match_name without legal suffixes), website (https:// + domain + E.164-ready), phone (libphonenumber-js E.164 + type), email (lowercase, mailto strip, image-filename discard), LinkedIn URL normalization, location builder.
- `merge.ts` (Section 13.2): match keys in SPEC order (company_domain, phone E.164, google_place_id/osm_id, match_name+postal_code, Jaro-Winkler >=0.90 + <=200m), haversine distance, field merge.
- `email-verify.ts` (Section 13.4 Basic): syntax, MX record (dns.resolveMx), disposable domain list, role-address list → email_status + email_type.
- `credits.ts` (Section 7.2/7.3): default credit costs, credit ledger entry helper.

**Sources (packages/sources):**
- Source Connector interface (Section 9.1) in `connector.ts`.
- `osm_overpass.ts` — Overpass QL local-business search with Business Type → OSM tag map.
- `nominatim.ts` — location text → bounding box + center.
- `website_enricher.ts` — rule-based website crawl (max 6 pages, priority paths, emails/phones/social/JSON-LD).
- `wikidata.ts` — SPARQL company search with dynamic property ID resolution (wbsearchentities, no hard-coded PIDs).

**Web app (apps/web):**
- Existing auth, admin shell, login from Phase 0 retained.

**Worker (apps/worker):**
- pg-boss worker skeleton from Phase 0 retained (job handlers registered per phase).

## How to run and test

```bash
pnpm install
pnpm run typecheck        # core, db, sources, web, worker
APP_ENCRYPTION_KEY=<base64> ADMIN_EMAILS=admin@example.com \
  DATABASE_URL=postgres://... \
  pnpm run test:unit      # 53 core tests pass
```

## Test result

- `packages/core`: 53 passed, 0 failed (6 files: encryption, http, normalize, merge, email-verify, credits)
- Type check: core, db, sources, web, worker — all clean

## New environment variables

None new beyond Phase 0 (`DATABASE_URL`, `APP_ENCRYPTION_KEY`, `AUTH_SECRET`, `ADMIN_EMAILS`).

## Open questions (docs/QUESTIONS.md)

1. Which SMTP/Resend credentials for local dev System email (Section 8.5)?
2. Exact 150+ Business Types seed data — Admin completes via Taxonomy UI; Phase 0 seeds a starter set.
3. cheerio/@types/cheerio added to `packages/sources` for website crawler; confirm bundle size acceptable for serverless `web` on Vercel.

## Known limits and risks

- OSM Overpass public instance has usage limits (Section 9.2 note); for production the Admin should configure a self-hosted/paid Overpass instance.
- Website enricher respects robots.txt (Section 11.1 rule 1) — needs robots.txt fetching logic added in Phase 1A hardening.
- Wikidata SPARQL query uses `wdt:Q783794` (instance of company) hard-coded; SPEC says don't hard-code property IDs without a check — this is an item ID not a property ID, but should be made configurable via Taxonomy.
- Paid connectors (Google Places, Hunter, Apollo, etc.) and AI features are Phase 1B.
- Docker not available in this environment; `docker compose up` not executed here.
