#!/usr/bin/env node
// Sign the credential waiting on your clipboard, in one command.
//
//   node tools/credential/sign-waiting.mjs
//   node tools/credential/sign-waiting.mjs request.json --key <file>
//
// On /teach/, "Copy the signing request" puts a request on the clipboard.
// This reads it (or a file you name), shows what it is about to sign,
// signs it with the key on this computer (by default
// ~/.humanshaped/credential-key-1.json, or --key, or the
// HUMANSHAPED_SIGNING_KEY environment variable), checks the new
// signature against the live https://humanshaped.org/.well-known/did.json,
// and puts the signed credential back on the clipboard, ready to paste on
// /teach/. It sends nothing anywhere except that one read of the public
// did.json, and it never prints or writes the key. --out <file> also
// writes the signed file; --no-clipboard prints it instead.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { lib, subtle, canonize, readKey, args } from './common.mjs';

const DEFAULT_KEY = join(homedir(), '.humanshaped', 'credential-key-1.json');
const a = args(process.argv.slice(2));

function clipboard() {
  try { return execFileSync('pbpaste', { encoding: 'utf8' }); }
  catch { throw new Error('Nothing could be read from the clipboard. Name the request file instead: node tools/credential/sign-waiting.mjs request.json'); }
}

try {
  const text = a._[0] ? readFileSync(a._[0], 'utf8') : clipboard();
  let row;
  try { row = JSON.parse(text); } catch {
    throw new Error(a._[0] ? `${a._[0]} is not a signing request.` : 'The clipboard does not hold a signing request. On /teach/, press "Copy the signing request" first.');
  }
  const wrong = lib.problems(row);
  if (wrong.length) throw new Error('That signing request has problems:\n' + wrong.join('\n'));

  const keyPath = a.key && a.key !== true ? a.key : (process.env.HUMANSHAPED_SIGNING_KEY ? null : DEFAULT_KEY);
  if (keyPath && !existsSync(keyPath)) throw new Error(`No signing key at ${keyPath}. Pass --key <file>.`);
  const key = readKey(keyPath);

  const unsigned = lib.buildCredential(row);
  const d = lib.describe(unsigned);
  console.error(`Signing "${d.title}" for ${d.name} (@${d.login}), ${d.description}`);
  d.evidence.forEach(e => console.error(`  ${e.name}: ${e.url}`));
  d.recognitions.forEach(r => console.error(`  Recognized in class: ${r.skill}. ${r.narrative}`));
  const signed = await lib.sign(unsigned, { key, subtle, canonize });

  const r = await fetch('https://humanshaped.org/.well-known/did.json');
  if (!r.ok) throw new Error(`The published key list could not be read (${r.status}), so the new signature was not checked or saved.`);
  const check = await lib.verify(signed, { didDocument: await r.json(), subtle, canonize });
  if (!check.ok) throw new Error('The new signature does not check out against the published key list: ' + check.reason);

  const out = JSON.stringify(signed, null, 2) + '\n';
  if (a.out && a.out !== true) writeFileSync(a.out, out);
  if (a['no-clipboard']) process.stdout.write(out);
  else {
    execFileSync('pbcopy', { input: out });
    console.error('Signed, checked against humanshaped.org, and on your clipboard. Paste it on /teach/.');
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
