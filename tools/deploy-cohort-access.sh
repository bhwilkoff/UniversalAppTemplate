#!/bin/sh
# Deploy the cohort-access Edge Function. It checks the person's own
# sign-in itself and through Supabase (verify_jwt on). The token is Ben's
# Supabase access token, kept in a file only his account can read, never
# in this repository.
set -e
cd "$(dirname "$0")/.."
SUPABASE_ACCESS_TOKEN="$(tr -d '\n\r ' < "$HOME/.humanshaped/supabase-token")" \
  npx -y supabase@latest functions deploy cohort-access --project-ref bifrieqzkihuxfzttgvd --use-api
