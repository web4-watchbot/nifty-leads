# Phase 0 Plan — Project Setup

**Goal:** Set up the monorepo, database, auth, security helpers, and CI so that `docker compose up` starts all services and an Admin can log in via email OTP.

## Scope (from SPEC Section 18, Phase 0)

1. Make a monorepo: `apps/web` (Next.js), `apps/worker` (Node.js), `packages/db`, `packages/sources`, `packages/ai`, `packages/core`, `wordpress-plugin/`.
2. Add Docker Compose with `web`, `worker`, and `postgres`.
3. Add Drizzle, the first migration, and seed data (Plans, Taxonomy, default Sources).
4. Add Better Auth with email OTP. Add the `admin` and `user` roles. Read `ADMIN_EMAILS` to make the first Admin.
5. Add the System email setting (Section 8.5).
6. Add the encryption helper (Section 17.1) and the SSRF-protected HTTP client (Section 17.2), with tests.
7. Add CI: type check, lint, unit tests, `npm audit`.
8. Make `AGENTS.md` and `.env.example`.

## Acceptance criteria (from SPEC)

- `docker compose up` starts all services with no errors.
- The Admin gets a login code by email and opens the Admin pages.
- A normal User cannot open the Admin pages (test).
- The SSRF tests block all ranges of Section 17.2.

## Package responsibilities

- `packages/db`: Drizzle schema, migrations, seed data, database client.
- `packages/core`: shared types, validation schemas, encryption helper, SSRF HTTP client, credit ledger helpers.
- `packages/sources`: Source Connector interface (Section 9.1) — stub in Phase 0, connectors added in Phase 1A.
- `packages/ai`: LLM task interfaces and prompt registry — stub in Phase 0, tasks added in Phase 1B.
- `apps/web`: Next.js App Router, Tailwind, shadcn/ui, pages, API routes, auth middleware.
- `apps/worker`: separate Node.js process running pg-boss jobs for the Run pipeline.
- `wordpress-plugin/`: `nifty-leads-connector` plugin (stub in Phase 0, full in Phase 1D).

## Files to create

- `package.json` (root, workspaces)
- `tsconfig.json` (root)
- `apps/web/package.json`, `apps/web/next.config.js`, `apps/web/tailwind.config.ts`, `apps/web/src/...`
- `apps/worker/package.json`, `apps/worker/src/...`
- `packages/db/package.json`, `packages/db/src/schema.ts`, `packages/db/src/migrations/`, `packages/db/src/seed.ts`
- `packages/core/package.json`, `packages/core/src/encryption.ts`, `packages/core/src/http.ts`, `packages/core/src/types.ts`
- `packages/sources/package.json`, `packages/sources/src/connector.ts`
- `packages/ai/package.json`, `packages/ai/src/tasks.ts`
- `wordpress-plugin/nifty-leads-connector/nifty-leads-connector.php` (stub)
- `docker-compose.yml`
- `.env.example`
- `AGENTS.md`
- `docs/SPEC.md` (copy of the spec)
- CI workflow: `.github/workflows/ci.yml`

## Order of work

1. Copy `docs/SPEC.md` into the project (done).
2. Write this plan (`docs/plans/phase-0.md`).
3. Create `AGENTS.md` (copy of Section 1.2 rules + link to SPEC.md).
4. Create `.env.example`.
5. Scaffold the monorepo (root package.json + workspaces, tsconfigs).
6. `packages/db`: schema (users, sessions, plans, subscriptions, credit_ledger, llm_providers, ai_task_routes, ai_usage, sources, source_calls, source_cache, rate_buckets, runs, raw_leads, leads, lead_people, lists, list_leads, stages, tags, lead_tags, custom_fields, custom_field_values, notes, tasks, activities, offer_profiles, sequences, sequence_steps, drafts, suppression_entries, taxonomy_business_types, taxonomy_industries, exports, imports, audit_log, wp_sso_jti, settings), first migration, seed.
7. `packages/core`: encryption helper + SSRF HTTP client + unit tests.
8. `apps/web`: Better Auth setup (email OTP), admin/user roles, `ADMIN_EMAILS`, System email settings page, auth middleware protecting `/admin` routes.
9. `apps/worker`: pg-boss client skeleton (jobs added in Phase 1A).
10. Docker Compose: `web`, `worker`, `postgres`.
11. CI workflow (type check, lint, tests, npm audit).
12. Write `docs/reports/phase-0.md` at the end.

## Open questions (to be logged in docs/QUESTIONS.md)

- Which SMTP/Resend credentials to use in local dev for the System email setting?
- Should the worker run as a separate `npm run worker` script or as part of the Next.js app in dev?
- Exact seed data for the 150+ Business Types (to be completed by the Admin via the Taxonomy UI).
