#!/bin/sh
# Deploy the session-read Edge Function. The token is Ben's Supabase access
# token, kept in a file only his account can read, never in this repository.
set -e
cd "$(dirname "$0")/.."
SUPABASE_ACCESS_TOKEN="$(tr -d '\n\r ' < "$HOME/.humanshaped/supabase-token")" \
  npx -y supabase@latest functions deploy session-read --project-ref bifrieqzkihuxfzttgvd --no-verify-jwt --use-api --yes
