#!/usr/bin/env node
// Check a signed credential.
//
//   node tools/credential/verify.mjs signed.json
//   node tools/credential/verify.mjs signed.json --did-json .well-known/did.json
//
// By default the issuer's keys are read from the live
// https://humanshaped.org/.well-known/did.json (did:web resolution);
// --did-json reads a local copy instead. Exits 0 when the signature
// checks out and 1 when it does not, with the reason in plain words.
import { lib, subtle, canonize, readJson, args } from './common.mjs';

const a = args(process.argv.slice(2));
try {
  const doc = readJson(a._[0] || '-');
  let did;
  if (a['did-json'] && a['did-json'] !== true) did = readJson(a['did-json']);
  else {
    const r = await fetch('https://humanshaped.org/.well-known/did.json');
    if (!r.ok) throw new Error(`The issuer's key list could not be fetched (${r.status}).`);
    did = await r.json();
  }
  const result = await lib.verify(doc, { didDocument: did, subtle, canonize });
  const d = lib.describe(doc);
  if (result.ok) {
    console.log(`Checks out: "${d.title}" for ${d.name}, signed by ${result.verificationMethod}.`);
  } else {
    console.log(`Does not check out: ${result.reason}`);
    process.exit(1);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
