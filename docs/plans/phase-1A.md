# Phase 1A Plan — Free Core

**Goal:** Build the free lead-finding core: OSM/Nominatim/Website/Wikidata connectors, search wizard, run pipeline, normalization/dedupe, basic email verification, exports, plan limits, and Admin pages.

## Scope (from SPEC Section 18, Phase 1A)

1. Lead, List, Run, RawLead, Credit and Source tables.
2. Source Connector interface (Section 9.1) and free connectors of Section 9.2. Start with `osm_overpass`, `nominatim`, `website_enricher` and `wikidata`.
3. Search wizard (Section 10.1), Run pipeline (Section 10.2) and live progress (Section 10.4).
4. Normalize, merge, dedupe and basic email verification (Section 13).
5. Lead table and Lead detail page.
6. Template Export (XLSX and CSV), Extended Export, Run Report (Section 6).
7. Plan limits and Credits (Section 7). Free Plan abuse control (Section 7.4).
8. Admin pages: Lead Sources, Plans and Credits, Taxonomy, Users, Jobs monitor, Audit log.

## Acceptance criteria

- A Free User searches "dentist" in "Pune, Maharashtra, India" with 25 results. The Run finishes in less than 5 minutes.
- The XLSX export opens in Excel. Row 1 equals the 12 template headers in Section 5.1 (automated test).
- The Phone Number cells keep the "+" in Excel.
- Sr. No. goes from 1 to the row count.
- A second identical Run does not make duplicate Leads.
- The Run Report shows the fill rate of each of the 12 columns.

## Files to create / extend

- `packages/sources/src/connectors/osm_overpass.ts`
- `packages/sources/src/connectors/nominatim.ts`
- `packages/sources/src/connectors/website_enricher.ts`
- `packages/sources/src/connectors/wikidata.ts`
- `packages/core/src/normalize.ts` (Section 13.1)
- `packages/core/src/merge.ts` (Section 13.2)
- `packages/core/src/email-verify.ts` (Section 13.4 basic)
- `packages/core/src/credits.ts` (Section 7.3 credit ledger helpers)
- `packages/core/tests/*.test.ts` for each module
- `apps/web/src/app/app/search/new/page.tsx` (wizard)
- `apps/web/src/app/app/runs/[id]/page.tsx` (progress + report)
- `apps/web/src/app/app/leads/[id]/page.tsx` (lead detail)
- `apps/web/src/app/app/exports/page.tsx` (exports)
- `apps/web/src/app/app/admin/sources/page.tsx`, `/plans`, `/users`, `/jobs`, `/audit`, `/taxonomy`

## Order of work

1. Write `docs/plans/phase-1A.md` (this file).
2. Extend `packages/core` with normalize, merge/dedupe, email-verify, credits + tests.
3. Implement 4 free source connectors in `packages/sources`.
4. Register pg-boss job handlers in `apps/worker`.
5. Build web wizard, runs, leads, exports pages.
6. Build Admin source/plan/taxonomy/user/jobs/audit pages.
7. Write `docs/reports/phase-1A.md` at the end.
