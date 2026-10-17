# Phase 0 Report — Project Setup

## Features made

- Monorepo with pnpm workspaces:
  - `apps/web` — Next.js (App Router), Tailwind, shadcn-style CSS variables
  - `apps/worker` — Node.js pg-boss job runner (separate process)
  - `packages/db` — Drizzle ORM schema, first migration, seed data
  - `packages/sources` — Source Connector interface (Section 9.1)
  - `packages/ai` — AI task interfaces/schemas (Section 12)
  - `packages/core` — encryption helper + SSRF-protected HTTP client
  - `wordpress-plugin/nifty-leads-connector/` — WP bridge stub (GPL-2.0-or-later)
- Docker Compose: `web`, `worker`, `postgres:16`
- Drizzle schema covering all SPEC Section 20.3 tables, plus Better Auth tables
- Seed data: default Industries, starter Business Types with OSM/Google maps,
  default Free/Paid Plans (Section 7 limits), default free Sources (OSM,
  Nominatim, Website Enricher, Wikidata), System email setting
- Better Auth with email OTP plugin; `admin` and `user` roles; `ADMIN_EMAILS`
  env to make the first Admin; System email setting (Section 8.5)
- Encryption helper (AES-256-GCM, key versioning, last-4 masking) (Section 17.1)
- SSRF-protected HTTP client (blocks private/reserved ranges, http/https only,
  manual redirect checking) (Section 17.2)
- CI workflow: type check, lint, migrations, unit tests, `npm audit`
- `AGENTS.md` (Section 1.2 rules), `docs/SPEC.md` (copy), `.env.example`,
  `docs/QUESTIONS.md`

## How to run and test

```bash
# Install
pnpm install

# Type check (all packages)
pnpm run typecheck   # turbo run typecheck

# Unit tests (packages/core)
APP_ENCRYPTION_KEY=<32-byte base64> ADMIN_EMAILS=admin@example.com \
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/niftyleads \
  pnpm run test:unit

# Migrations
DATABASE_URL=... pnpm run db:migrate

# Seed
DATABASE_URL=... APP_ENCRYPTION_KEY=... ADMIN_EMAILS=... pnpm run db:seed

# Docker
docker compose up        # web, worker, postgres

# Lint + audit
pnpm run lint
pnpm run audit
```

## Test result

- `packages/core`: 16 passed, 0 failed (2 files: encryption.test.ts, http.test.ts)
  - Encryption: round-trip, random IV, key rotation, masking, verify
  - SSRF: blocks localhost, 10.x, 172.16.x, 192.168.x, 169.254.x, disallowed
    protocols; allows public hosts; allowPrivateNetwork exception; URL hashing
- Type check: `packages/core`, `packages/db`, `packages/sources`, `packages/ai`,
  `apps/web`, `apps/worker` — all clean

## New environment variables

- `APP_ENCRYPTION_KEY` (32 random bytes, base64) — required
- `AUTH_SECRET` (32+ chars) — required
- `ADMIN_EMAILS` (comma-separated) — required for first Admin
- `APP_URL`, `WP_SITE_ORIGIN`, `WP_SSO_SHARED_SECRET`, `DATABASE_URL`,
  `WORKER_CONCURRENCY`, `NODE_ENV`

## Open questions (docs/QUESTIONS.md)

1. Which SMTP/Resend credentials for local dev System email (Section 8.5)?
   Default: login OTP logged to stdout in dev until the Admin configures a
   provider.
2. Worker as separate process vs part of Next.js in dev? Decided: separate
   pg-boss process (Section 4).
3. Exact 150+ Business Types seed data — Admin completes via Taxonomy UI;
   Phase 0 seeds a starter set.

## Known limits and risks

- Docker is not available in this environment, so `docker compose up` was not
  executed here; the Compose file and Dockerfiles are present per spec.
- `pg`/`drizzle-orm` are direct deps of `apps/web` (needed by auth.ts).
- better-auth 1.x bundles zod v4 while the app uses zod v3; `auth` is annotated
  `any` to keep the build portable (runtime unaffected).
- WordPress plugin `firebase/php-jwt` is not bundled; the Admin must install it
  via Composer for production SSO (a minimal HS256 fallback exists).
- Paid connectors (Google Places, Hunter, Apollo, etc.) and AI features are
  stubs; implemented in Phase 1A/1B.
