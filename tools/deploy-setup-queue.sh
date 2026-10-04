#!/bin/sh
# Deploy the setup-queue Edge Function with the site's own TeachLib beside
# it, so the setup meet@'s script receives is built by the same code as
# /teach/'s "Copy the setup for the Meet script". The token is Ben's
# Supabase access token, kept in a file only his account can read, never
# in this repository.
set -e
cd "$(dirname "$0")/.."
F=supabase/functions/setup-queue
cp assets/teach-lib.js "$F/"
trap 'rm -f "$F/teach-lib.js"' EXIT
SUPABASE_ACCESS_TOKEN="$(tr -d '\n\r ' < "$HOME/.humanshaped/supabase-token")" \
  npx -y supabase@latest functions deploy setup-queue --project-ref bifrieqzkihuxfzttgvd --no-verify-jwt --use-api
