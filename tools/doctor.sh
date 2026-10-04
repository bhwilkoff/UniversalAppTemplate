#!/bin/sh
# What this Mac has ready for running humanshaped.org, and what is missing.
# It only reads: it prints no secret, changes nothing, and is safe to run
# any time with `sh tools/doctor.sh` from the site folder.
cd "$(dirname "$0")/.." || exit 1
ok() { printf '  ok       %s\n' "$1"; }
no() { printf '  MISSING  %s\n           %s\n' "$1" "$2"; }

echo "Tools"
command -v node >/dev/null && ok "node $(node --version)" || no "node" "brew install node"
command -v gh >/dev/null && ok "gh (GitHub CLI)" || no "gh" "brew install gh, then gh auth login"
command -v clasp >/dev/null && ok "clasp $(clasp --version 2>/dev/null)" || no "clasp" "npm install -g @google/clasp"
command -v python3 >/dev/null && ok "python3" || no "python3" "brew install python"

echo "Accounts"
gh auth status >/dev/null 2>&1 && ok "GitHub signed in as $(gh api user --jq .login 2>/dev/null)" || no "GitHub sign-in" "gh auth login"
who=$(clasp show-authorized-user 2>/dev/null | grep -o '[^ ]*@[^ .]*\.[a-z]*' | head -1)
[ "$who" = "meet@humanshaped.org" ] && ok "clasp signed in as meet@humanshaped.org" \
  || no "clasp as meet@humanshaped.org (now: ${who:-nobody})" "clasp login, and choose meet@ in the browser"
[ -f tools/meet-events/.clasp.json ] && ok "the Meet script is linked (tools/meet-events/.clasp.json)" \
  || no "the Meet script link" "ask the agent to recreate tools/meet-events/.clasp.json"

echo "Keys kept on this Mac (never in the repository)"
f="$HOME/.humanshaped/supabase-token"
[ -s "$f" ] && ok "Supabase access token ($f)" || no "Supabase access token" "make one at supabase.com/dashboard/account/tokens and save it to $f"
f="$HOME/.humanshaped/credential-key-1.json"
[ -s "$f" ] && ok "credential signing key ($f); keep a copy in your password manager" \
  || no "credential signing key" "node tools/credential/make-key.mjs --out $f (only once, ever)"
for f in "$HOME/.humanshaped/"*; do
  [ -e "$f" ] || continue
  m=$(stat -f '%Lp' "$f")
  [ "$m" = "600" ] || [ "$m" = "700" ] || no "$f can be read by others ($m)" "chmod 600 $f"
done

echo "Project setup"
[ -d tools/credential/node_modules ] && ok "credential tools installed" || no "credential tools" "npm ci --prefix tools/credential"
curl -fsS https://humanshaped.org/.well-known/did.json 2>/dev/null | grep -q '"publicKeyMultibase"' \
  && ok "the signing key's public half is published" || no "published signing key" "push .well-known/did.json"
curl -fsS https://raw.githubusercontent.com/humanshaped/community/main/community.json >/dev/null 2>&1 \
  && ok "community.json is published" || no "community.json" "run the Publish workflow in humanshaped/community"
