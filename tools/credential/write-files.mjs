#!/usr/bin/env node
// Write the credential's public files from assets/credential-lib.js:
// one achievement per level at credential/achievements/level-N.json, and
// .well-known/did.json if it does not exist yet (with no key until
// make-key.mjs adds one). Run it after changing a level's words.
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { lib, SITE_ROOT } from './common.mjs';

const dir = join(SITE_ROOT, 'credential', 'achievements');
mkdirSync(dir, { recursive: true });
lib.PLATFORMS.forEach((p, i) => {
  writeFileSync(join(dir, `level-${i + 1}.json`), JSON.stringify(lib.achievementDocument(i + 1), null, 2) + '\n');
});
const did = join(SITE_ROOT, '.well-known', 'did.json');
if (!existsSync(did)) {
  mkdirSync(join(SITE_ROOT, '.well-known'), { recursive: true });
  writeFileSync(did, JSON.stringify(lib.didDocument([]), null, 2) + '\n');
}
console.log(`Wrote ${lib.PLATFORMS.length} achievements${existsSync(did) ? '' : ' and did.json'}.`);
