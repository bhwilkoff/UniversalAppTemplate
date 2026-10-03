// Sign, check, and tamper with a credential using a throwaway key made in
// a temporary folder, and check our signatures against Digital Bazaar's
// libraries (the reference implementation of Data Integrity), in both
// directions. Run from tools/credential: npm install && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as vc from '@digitalbazaar/vc';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import { cryptosuite as eddsaRdfc2022 } from '@digitalbazaar/eddsa-rdfc-2022-cryptosuite';
import * as Ed25519Multikey from '@digitalbazaar/ed25519-multikey';
import { securityLoader } from '@digitalbazaar/security-document-loader';
import { lib, subtle, canonize, documentLoader as ourContexts, SITE_ROOT } from '../common.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'hs-credential-test-'));

const row = {
  credential: '6f1c2b9e-3d4a-4f5b-8c7d-2e1f0a9b8c7d',
  issued_at: '2026-09-20T18:30:00.000Z',
  person: { github_login: 'bea-example', name: 'Bea Example' },
  cohort: { title: 'Test cohort' },
  app: { name: 'Garden Swap', repo: 'bea-example/garden-swap', url: 'https://bea-example.github.io/garden-swap/' },
  platforms: ['web', 'android'],
  links: { android: 'https://play.google.com/store/apps/details?id=org.example.gardenswap' }
};

const key = await lib.generateKey(subtle, 'key-1');
const did = lib.didDocument([key]);
const clone = x => JSON.parse(JSON.stringify(x));
const check = doc => lib.verify(doc, { didDocument: did, subtle, canonize });

// A document loader for Digital Bazaar's libraries: our contexts, theirs,
// the Multikey context, and our DID document in place of did:web.
const theirs = securityLoader().build();
const multikey = JSON.parse(readFileSync(join(HERE, 'fixtures', 'multikey-v1.json'), 'utf8'));
async function loader(url) {
  if (url.startsWith(lib.ISSUER_DID)) {
    const [base, fragment] = url.split('#');
    if (!fragment) return { contextUrl: null, documentUrl: url, document: did };
    const vm = did.verificationMethod.find(m => m.id === url);
    return { contextUrl: null, documentUrl: url, document: { '@context': 'https://w3id.org/security/multikey/v1', ...vm } };
  }
  if (url === 'https://w3id.org/security/multikey/v1') return { contextUrl: null, documentUrl: url, document: multikey };
  if (lib.CONTEXT_FILES[url]) return ourContexts(url);
  return theirs(url);
}

const unsigned = lib.buildCredential(row);
const signed = await lib.sign(unsigned, { key, subtle, canonize, created: '2026-09-21T09:00:00Z' });

test('a credential signed with a throwaway key checks out', async () => {
  const r = await check(signed);
  assert.equal(r.ok, true, r.reason);
  assert.equal(signed.proof.cryptosuite, 'eddsa-rdfc-2022');
  assert.match(signed.proof.proofValue, /^z/);
});

test('changing the name fails', async () => {
  const d = clone(signed);
  d.credentialSubject.identifier[0].identityHash = 'Someone Else';
  assert.deepEqual(await check(d), { ok: false, reason: 'Something in it has changed since it was signed.' });
});

test('changing an evidence link fails', async () => {
  const d = clone(signed);
  d.evidence[1].id = 'https://example.org/not-the-app';
  assert.equal((await check(d)).ok, false);
});

test('raising the level fails', async () => {
  const d = clone(signed);
  d.credentialSubject.achievement = lib.achievement(3);
  assert.equal((await check(d)).ok, false);
});

test('changing the date fails', async () => {
  const d = clone(signed);
  d.validFrom = '2025-01-01T00:00:00Z';
  assert.equal((await check(d)).ok, false);
});

test('changing the proof’s own date fails', async () => {
  const d = clone(signed);
  d.proof.created = '2026-09-22T09:00:00Z';
  assert.equal((await check(d)).ok, false);
});

test('a field the standard does not define is refused, rather than silently left unsigned', async () => {
  const d = clone(signed);
  d.credentialSubject.grade = 'A+';
  const r = await check(d);
  assert.equal(r.ok, false);
  assert.match(r.reason, /not part of the credential standard/);
});

test('a credential signed by another key fails, even if it names ours', async () => {
  const other = await lib.generateKey(subtle, 'key-1');
  const forged = await lib.sign(unsigned, { key: other, subtle, canonize });
  assert.deepEqual(await check(forged), { ok: false, reason: 'Something in it has changed since it was signed.' });
});

test('a key not in the DID document is refused', async () => {
  const d = clone(signed);
  d.proof.verificationMethod = lib.ISSUER_DID + '#key-9';
  assert.match((await check(d)).reason, /does not list as its own/);
});

test('a credential from another issuer is refused', async () => {
  const d = clone(signed);
  d.issuer.id = 'did:web:example.org';
  assert.match((await check(d)).reason, /humanshaped\.org/);
});

test('the signed file says exactly what the row says, and nothing else', () => {
  assert.equal(lib.matchesRow(signed, row), true);
  assert.equal(lib.matchesRow(signed, { ...row, platforms: ['web'], links: {} }), false);
});

test('Digital Bazaar’s verifier accepts our signature', async () => {
  const suite = new DataIntegrityProof({ cryptosuite: eddsaRdfc2022 });
  const r = await vc.verifyCredential({ credential: signed, suite, documentLoader: loader });
  assert.equal(r.verified, true, String(r.error && (r.error.errors || [r.error]).map(e => e.stack || e.message)));
});

test('Digital Bazaar’s verifier rejects a changed copy', async () => {
  const d = clone(signed);
  d.description = 'For something else.';
  const suite = new DataIntegrityProof({ cryptosuite: eddsaRdfc2022 });
  const r = await vc.verifyCredential({ credential: d, suite, documentLoader: loader });
  assert.equal(r.verified, false);
  assert.match(String(r.error && (r.error.errors || [r.error]).map(e => e.message)), /[Ss]ignature/);
});

test('our checker accepts a signature made by Digital Bazaar’s signer', async () => {
  const pair = await Ed25519Multikey.from({ ...key });
  const suite = new DataIntegrityProof({ signer: pair.signer(), cryptosuite: eddsaRdfc2022 });
  const theirsSigned = await vc.issue({ credential: clone(unsigned), suite, documentLoader: loader });
  assert.equal(theirsSigned.proof.verificationMethod, key.id);
  const r = await check(theirsSigned);
  assert.equal(r.ok, true, r.reason);
});

test('the same key and date give the same signature as Digital Bazaar’s (Ed25519 is deterministic)', async () => {
  const pair = await Ed25519Multikey.from({ ...key });
  const suite = new DataIntegrityProof({ signer: pair.signer(), cryptosuite: eddsaRdfc2022, date: '2026-09-21T09:00:00Z' });
  const theirsSigned = await vc.issue({ credential: clone(unsigned), suite, documentLoader: loader });
  assert.equal(theirsSigned.proof.proofValue, signed.proof.proofValue);
});

// The command-line tools, end to end, with the key in a temporary folder.
const node = process.execPath;
const tool = name => join(SITE_ROOT, 'tools', 'credential', name);

test('make-key writes the key outside the repository, readable only by its owner, and only the public half into did.json', () => {
  const out = join(tmp, 'key.json');
  const didPath = join(tmp, 'did.json');
  execFileSync(node, [tool('make-key.mjs'), '--out', out, '--did-json', didPath]);
  assert.equal(statSync(out).mode & 0o777, 0o600);
  const didText = readFileSync(didPath, 'utf8');
  const k = JSON.parse(readFileSync(out, 'utf8'));
  assert.ok(didText.includes(k.publicKeyMultibase));
  assert.ok(!didText.includes(k.secretKeyMultibase));
  assert.ok(!/secret/i.test(didText));
});

test('make-key refuses to write a key inside the repository', () => {
  const inside = join(SITE_ROOT, '.well-known', 'test-key-should-not-exist.json');
  const r = spawnSync(node, [tool('make-key.mjs'), '--out', inside, '--did-json', join(tmp, 'did2.json')]);
  assert.equal(r.status, 2);
  assert.equal(existsSync(inside), false);
});

test('sign and verify, from the command line, and verify fails on a changed file', () => {
  const rowPath = join(tmp, 'row.json');
  const outPath = join(tmp, 'signed.json');
  writeFileSync(rowPath, JSON.stringify(row));
  execFileSync(node, [tool('sign.mjs'), rowPath, '--key', join(tmp, 'key.json'), '--out', outPath], { stdio: 'pipe' });
  const ok = spawnSync(node, [tool('verify.mjs'), outPath, '--did-json', join(tmp, 'did.json')], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /^Checks out/);
  const d = JSON.parse(readFileSync(outPath, 'utf8'));
  d.credentialSubject.id = 'https://github.com/someone-else';
  writeFileSync(outPath, JSON.stringify(d));
  const bad = spawnSync(node, [tool('verify.mjs'), outPath, '--did-json', join(tmp, 'did.json')], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /Does not check out/);
});

test('sign refuses a row with a problem and says what it is', () => {
  const rowPath = join(tmp, 'bad-row.json');
  writeFileSync(rowPath, JSON.stringify({ ...row, platforms: ['web', 'android'], links: {} }));
  const r = spawnSync(node, [tool('sign.mjs'), rowPath, '--key', join(tmp, 'key.json')], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Android needs a link/);
});
