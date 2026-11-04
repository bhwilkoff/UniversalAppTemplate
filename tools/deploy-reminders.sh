#!/bin/sh
# Deploy the reminders Edge Function with the site's words beside it, and
# the role rules from cohort-access, so neither is written twice. verify_jwt
# is off: the caller is Supabase Cron, which sends x-reminders-key.
set -e
cd "$(dirname "$0")/.."
F=supabase/functions/reminders
cp assets/reminders-lib.js supabase/functions/cohort-access/plan.js "$F/"
trap 'rm -f "$F/reminders-lib.js" "$F/plan.js"' EXIT
SUPABASE_ACCESS_TOKEN="$(tr -d '\n\r ' < "$HOME/.humanshaped/supabase-token")" \
  npx -y supabase@latest functions deploy reminders --project-ref bifrieqzkihuxfzttgvd --no-verify-jwt --use-api --yes
