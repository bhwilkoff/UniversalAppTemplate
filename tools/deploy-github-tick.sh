#!/bin/sh
# Deploy the github-tick Edge Function with the site's own discussion
# helpers beside it, so the server opens a session's thread with the same
# words and category as /live/ does. verify_jwt is off: the caller is a
# GitHub Actions workflow, which proves itself with GitHub's OIDC token.
set -e
cd "$(dirname "$0")/.."
F=supabase/functions/github-tick
cp assets/discussions-lib.js assets/session-thread-lib.js "$F/"
trap 'rm -f "$F/discussions-lib.js" "$F/session-thread-lib.js"' EXIT
SUPABASE_ACCESS_TOKEN="$(tr -d '\n\r ' < "$HOME/.humanshaped/supabase-token")" \
  npx -y supabase@latest functions deploy github-tick --project-ref bifrieqzkihuxfzttgvd --no-verify-jwt --use-api
