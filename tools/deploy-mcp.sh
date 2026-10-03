#!/bin/sh
# Deploy the mcp Edge Function with the site's own week, schedule, and
# live-session helpers beside it, so the server and the site share one
# copy of that logic. The token is Ben's Supabase access token, kept in a
# file only his account can read, never in this repository.
set -e
cd "$(dirname "$0")/.."
F=supabase/functions/mcp
cp assets/cohort-lib.js assets/teach-lib.js assets/live-lib.js "$F/"
trap 'rm -f "$F/cohort-lib.js" "$F/teach-lib.js" "$F/live-lib.js"' EXIT
SUPABASE_ACCESS_TOKEN="$(tr -d '\n\r ' < "$HOME/.humanshaped/supabase-token")" \
  npx -y supabase@latest functions deploy mcp --project-ref bifrieqzkihuxfzttgvd --no-verify-jwt --use-api
