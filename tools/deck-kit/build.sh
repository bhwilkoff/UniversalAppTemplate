#!/bin/sh
# Builds assets/vendor/deck-kit.js from Tiny Little Office at a pinned commit.
# Run from anywhere; nothing is installed in this repository.
set -e
COMMIT=2e62769
HERE=$(cd "$(dirname "$0")" && pwd)
SITE=$(cd "$HERE/../.." && pwd)
WORK=${DECK_KIT_WORK:-$(mktemp -d)}
[ -d "$WORK/tlo" ] || git clone -q https://github.com/aboard-io/tinylittleoffice "$WORK/tlo"
git -C "$WORK/tlo" checkout -q "$COMMIT"
cd "$WORK"
[ -f package.json ] || echo '{"private":true}' > package.json
npm i --ignore-scripts --no-audit --no-fund --silent esbuild lucide@1.57.0 @fluent/bundle@0.19.1 lit@3.3.3 fflate@0.8.3 d3-sankey@0.12.3 mathjs@15.2.0
cp "$HERE/entry.ts" entry.ts
{ printf '/*! The deck of Tiny Little Office, commit %s. https://github.com/aboard-io/tinylittleoffice\n' "$COMMIT"; sed 's/^/ * /' tlo/LICENSE; printf ' */\n'; } > banner.txt
NODE_PATH="$WORK/node_modules" ./node_modules/.bin/esbuild entry.ts --bundle --format=iife --global-name=DeckKit --platform=browser \
  --outfile=deck-kit.js --minify --log-level=error --alias:@tlo="$WORK/tlo" \
  '--external:*editor.ts' '--external:*commands.ts' '--external:*templates.ts' '--external:*.css' --external:maplibre-gl \
  --loader:.ftl=text --loader:.md=text
cat banner.txt deck-kit.js > "$SITE/assets/vendor/deck-kit.js"
wc -c "$SITE/assets/vendor/deck-kit.js"
