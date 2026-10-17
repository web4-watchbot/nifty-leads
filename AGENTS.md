# Nifty Leads — Agent instructions

This project is built from `docs/SPEC.md`. Read it first.

## Work rules (from SPEC Section 1.2)

1. Do one phase at a time. Stop at the end of each phase.
2. Before you write code for a phase, write the plan in `docs/plans/phase-N.md`.
3. Use TypeScript in strict mode for all app code.
4. Write unit tests for each module that changes data.
5. Run all tests before you report a phase as complete.
6. Do not put secrets in code, logs, tests, fixtures or git history.
7. Do not call live paid APIs in tests. Use recorded fixtures.
8. Do not copy code from GPL or AGPL repositories. Use them for design ideas only (Section 19).
9. If you do not know the current API of a library or a provider, read its current documentation. Do not guess.
10. If a requirement is not clear, write the question in `docs/QUESTIONS.md`. Use the safest default. Continue the work.
11. Do not write a database migration that deletes user data without a backup step.
12. Use each term in Section 2 with one meaning only.
13. At the end of each phase, write `docs/reports/phase-N.md`. Include: what you did, how to run it, the test result, and open questions.

## Phases (SPEC Section 18)

- Phase 0: Project setup
- Phase 1A: Free core
- Phase 1B: Paid core
- Phase 1C: CRM and outreach Drafts
- Phase 1D: WordPress bridge
- Phase 2: Sending and growth

## Spec link

`docs/SPEC.md` — the full build specification for Nifty Leads.
