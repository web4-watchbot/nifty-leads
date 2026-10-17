#!/usr/bin/env bash
# Deploy to Vercel production, then re-bind the short alias.
#
# Why this exists:
#   The domain record for `nifty-leads.vercel.app` MUST NOT exist in the
#   Vercel dashboard (Settings -> Domains). With the record present, Vercel's
#   edge returns 404 NOT_FOUND globally for the hostname. As a pure alias the
#   hostname routes correctly. Pure aliases do NOT auto-rebind when a new
#   production deployment is created, so this script re-binds it after deploy.
#
# Usage: pnpm run deploy   (from the repo root)
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=$(vercel --prod --yes 2>&1) || { printf '%s\n' "$OUT"; exit 1; }
printf '%s\n' "$OUT"

URL=$(printf '%s' "$OUT" | grep -oE 'https://nifty-leads-[a-z0-9]+-madansa7s-projects\.vercel\.app' | head -1 || true)
if [ -z "$URL" ]; then
  echo "ERROR: could not detect the new deployment URL" >&2
  exit 1
fi

vercel alias set "$URL" nifty-leads.vercel.app
echo "OK: https://nifty-leads.vercel.app -> $URL"
