#!/bin/sh
# Deploy the github-token Edge Function (verify_jwt on: only a signed-in
# person may ask, for themselves). The token is Ben's Supabase access
# token, kept in a file only his account can read, never in this repository.
set -e
cd "$(dirname "$0")/.."
SUPABASE_ACCESS_TOKEN="$(tr -d '\n\r ' < ~/.humanshaped/supabase-token)" \
  npx -y supabase@latest functions deploy github-token --project-ref bifrieqzkihuxfzttgvd --use-api
