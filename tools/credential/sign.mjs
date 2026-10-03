#!/usr/bin/env node
// Sign one credential.
//
//   pbpaste | node tools/credential/sign.mjs --key ~/.humanshaped/credential-key-1.json > signed.json
//
// Reads the signing request that /teach/ copies (a credential row: the
// person, the cohort, the app's repository and live links, and the
// platforms), builds the Open Badges 3.0 credential from it, signs it
// with eddsa-rdfc-2022, checks the signature it just made, and writes
// the signed credential to stdout (or --out). What it is about to sign
// goes to stderr first, so you can read it. The key comes from --key or
// the HUMANSHAPED_SIGNING_KEY environment variable (a GitHub Actions
// secret), and is never written anywhere.
import { writeFileSync } from 'node:fs';
import { lib, subtle, canonize, readJson, readKey, args } from './common.mjs';

const a = args(process.argv.slice(2));
try {
  const row = readJson(a._[0] || '-');
  const key = readKey(a.key === true ? null : a.key);
  const wrong = lib.problems(row);
  if (wrong.length) throw new Error(wrong.join('\n'));
  const unsigned = lib.buildCredential(row);
  const d = lib.describe(unsigned);
  console.error(`Signing "${d.title}" for ${d.name} (@${d.login}), ${d.description}`);
  d.evidence.forEach(e => console.error(`  ${e.name}: ${e.url}`));

  const signed = await lib.sign(unsigned, { key, subtle, canonize });
  const check = await lib.verify(signed, { didDocument: lib.didDocument([key]), subtle, canonize });
  if (!check.ok) throw new Error('The new signature did not check out: ' + check.reason);

  const text = JSON.stringify(signed, null, 2) + '\n';
  if (a.out && a.out !== true) { writeFileSync(a.out, text); console.error(`Signed, and written to ${a.out}.`); }
  else process.stdout.write(text);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
