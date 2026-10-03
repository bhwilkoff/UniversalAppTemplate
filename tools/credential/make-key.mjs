#!/usr/bin/env node
// Make humanshaped.org's signing key, once, on the signer's own computer.
//
//   node tools/credential/make-key.mjs --out ~/.humanshaped/credential-key-1.json
//
// Writes the key (public and secret) to --out, readable only by you, and
// refuses any place inside this repository, because everything in it is
// public. Then adds only the public half to .well-known/did.json, where
// verifiers look for it. Commit and push did.json; keep the key file, and
// a copy of it somewhere safe, since a lost key cannot sign again and a
// leaked one can sign as humanshaped.org.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { lib, subtle, insideSite, args, SITE_ROOT } from './common.mjs';

const a = args(process.argv.slice(2));
const out = a.out;
const fragment = a.id || 'key-1';
const didPath = a['did-json'] || join(SITE_ROOT, '.well-known', 'did.json');

if (!out || out === true) {
  console.error('Say where the key goes: --out ~/.humanshaped/credential-key-1.json (outside this repository).');
  process.exit(2);
}
if (insideSite(out)) {
  console.error('Refusing to write a private key inside the repository, where it would be published. Choose a place outside it.');
  process.exit(2);
}
if (existsSync(out)) {
  console.error(`${out} already exists. Choose a new file (and a new --id) rather than overwrite a key.`);
  process.exit(2);
}
if (!/^[A-Za-z0-9-]+$/.test(fragment)) {
  console.error('The key id is letters, numbers, and hyphens, like key-1.');
  process.exit(2);
}

const did = existsSync(didPath) ? JSON.parse(readFileSync(didPath, 'utf8')) : lib.didDocument([]);
if ((did.verificationMethod || []).some(m => m.id.endsWith('#' + fragment))) {
  console.error(`did.json already lists #${fragment}. Use --id key-2 (old keys stay listed so old credentials still check).`);
  process.exit(2);
}

const key = await lib.generateKey(subtle, fragment);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(key, null, 2) + '\n', { mode: 0o600 });

did.verificationMethod = (did.verificationMethod || []).concat([lib.publicPart(key)]);
did.assertionMethod = (did.assertionMethod || []).concat([key.id]);
writeFileSync(didPath, JSON.stringify(did, null, 2) + '\n');

console.log(`The key is in ${out} (only you can read it).`);
console.log(`Its public half, ${key.id}, is now in ${didPath}:`);
console.log(`  ${key.publicKeyMultibase}`);
console.log('Commit and push did.json, and keep a copy of the key file somewhere safe.');
