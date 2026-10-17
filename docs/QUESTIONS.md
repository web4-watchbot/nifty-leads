# Open Questions (Nifty Leads)

## Phase 0

1. Which SMTP/Resend credentials to use in local dev for the System email setting (Section 8.5)? Safest default: no email provider configured until the Admin sets one; login OTP logs to stdout in dev.
2. Should the worker run as a separate `npm run worker` script or as part of the Next.js app in dev? Decision: separate process via pg-boss (spec Section 4).
3. Exact seed data for the 150+ Business Types (Section 5.5): to be completed by the Admin via the Taxonomy UI. Phase 0 seeds Plans, default Industries, and a starter set of Business Types with OSM/Google maps.

## Operations

1. **Vercel domain-record issue for `nifty-leads.vercel.app` (17 Oct 2026):** With the hostname present as a *domain record* (Settings → Domains), Vercel's edge returns `404 NOT_FOUND` globally (verified from multiple PoPs) despite a correct `verified: true` record and alias binding. As a *pure alias* (no domain record) the same hostname routes correctly. Resolution: the domain record is permanently removed from the dashboard, and `pnpm run deploy` (`scripts/deploy.sh`) re-binds the alias after every production deploy, because pure aliases do not auto-rebind. Safe default: never re-add `nifty-leads.vercel.app` in the Domains UI. Open question for Vercel support: why the domain-record binding fails for this hostname.
2. Supabase `DATABASE_URL` uses port `5432` (direct). If connection pooling is needed later, switch to the pooler URI (port `6543`) — pooler requires `?sslmode=require` and prepared-statement config for pg/drizzle.
3. **Migration renumber (17 Oct 2026):** drizzle-kit was upgraded 0.30.6 → 0.31.11 (0.30.6 cannot load TS configs under Node 24). The regenerated journal produced `0000_faithful_thor_girl.sql` (full create of the current schema, including the better-auth `verifications.updatedAt`/nullable `type` fixes); the superseded `0001_initial.sql` was removed. Phase 0/1A docs still mention `0001_initial.sql` — historical records, not current state. A local Docker database migrated under the old file needs a volume reset (`docker compose down -v`) before re-running `pnpm run db:migrate`. Supabase was never migrated, so it just runs `0000`.
4. **Admin first login:** `BETTER_AUTH_URL=https://nifty-leads.vercel.app` is set as a Vercel env var. With no email provider configured, the OTP code is logged to the function logs — read it once from Vercel Dashboard → Deployments → Logs, then configure a provider (Section 8.5) from Admin Settings. Users in `ADMIN_EMAILS` get the `admin` role at sign-up (wired in `databaseHooks.user.create.before`).
