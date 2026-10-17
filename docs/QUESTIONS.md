# Open Questions (Nifty Leads)

## Phase 0

1. Which SMTP/Resend credentials to use in local dev for the System email setting (Section 8.5)? Safest default: no email provider configured until the Admin sets one; login OTP logs to stdout in dev.
2. Should the worker run as a separate `npm run worker` script or as part of the Next.js app in dev? Decision: separate process via pg-boss (spec Section 4).
3. Exact seed data for the 150+ Business Types (Section 5.5): to be completed by the Admin via the Taxonomy UI. Phase 0 seeds Plans, default Industries, and a starter set of Business Types with OSM/Google maps.
