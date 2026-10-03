// node --test tools/test/
// The credential's pure logic, with no libraries: the real
// canonicalization is tested in tools/credential/test/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const lib = createRequire(import.meta.url)('../../assets/credential-lib.js');
const root = new URL('../../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');

const row = {
  credential: '6f1c2b9e-3d4a-4f5b-8c7d-2e1f0a9b8c7d',
  issued_at: '2026-09-20T18:30:00.000Z',
  person: { github_login: 'bea-example', name: 'Bea Example' },
  cohort: { title: 'Test cohort' },
  app: { name: 'Garden Swap', repo: 'bea-example/garden-swap', url: 'https://bea-example.github.io/garden-swap/' },
  platforms: ['web', 'android'],
  links: { android: 'https://play.google.com/store/apps/details?id=x' }
};

test('base58btc matches known values', () => {
  // The multibase spec's example ("zUXE7G..." without its z), checked against base58-universal.
  const bytes = new TextEncoder().encode('Decentralize everything!!');
  assert.equal(lib.base58Encode(bytes), 'UXE7GvtEk8XTXs1GF8HSGbVA9FCX9SEBPe');
  assert.deepEqual(Array.from(lib.base58Decode('UXE7GvtEk8XTXs1GF8HSGbVA9FCX9SEBPe')), Array.from(bytes));
  assert.equal(lib.base58Encode(new Uint8Array([0, 0, 1])), '112');
  assert.deepEqual(Array.from(lib.base58Decode('112')), [0, 0, 1]);
});

test('an Ed25519 public key as a Multikey starts with z6Mk, and a secret key with z3u2', () => {
  // The key pair from W3C Data Integrity EdDSA Cryptosuites, appendix A.
  const pub = 'z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2';
  const sec = 'z3u2en7t5LR2WtQH5PfFqMqwVHBeXouLzo6haApm8XHqvjxq';
  assert.equal(lib.publicKeyMultibase(lib.publicKeyBytes(pub)), pub);
  assert.equal(lib.secretKeyMultibase(lib.secretKeyBytes(sec)), sec);
  assert.throws(() => lib.publicKeyBytes(sec), /not an Ed25519 public key/);
});

test('the W3C example secret key derives its public key through Web Crypto', async () => {
  const key = { id: lib.ISSUER_DID + '#k', publicKeyMultibase: 'z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2', secretKeyMultibase: 'z3u2en7t5LR2WtQH5PfFqMqwVHBeXouLzo6haApm8XHqvjxq' };
  // Signing with a mismatched pair would fail to verify; a matched pair
  // round-trips through sign and verify with a stand-in canonicalization.
  const canonize = async doc => lib.stable(doc);
  const signed = await lib.sign({ '@context': lib.CONTEXTS, issuer: { id: lib.ISSUER_DID }, a: 1 }, { key, subtle: crypto.subtle, canonize });
  const r = await lib.verify(signed, { didDocument: lib.didDocument([key]), subtle: crypto.subtle, canonize });
  assert.equal(r.ok, true, r.reason);
});

test('the level is the number of platforms, and the web alone is level one', () => {
  assert.equal(lib.levelFor(['web']), 1);
  assert.equal(lib.levelFor(['web', 'android', 'windows']), 3);
  assert.equal(lib.levelName(1), 'Human-shaped software, live on the web');
  assert.equal(lib.levelName(3), 'Human-shaped software, live on three platforms');
  assert.match(lib.achievement(2).description, /one more platform,/);
  assert.match(lib.achievement(3).description, /two more platforms,/);
});

test('a row with problems says what each one is, in plain words', () => {
  assert.deepEqual(lib.problems(row), []);
  const bad = lib.problems({ ...row, app: { repo: 'nope', url: 'http://x' }, platforms: ['android', 'android', 'gameboy'], links: { windows: 'https://x' } });
  assert.ok(bad.includes('The app has no repository, written as owner/name.'));
  assert.ok(bad.includes('The app has no live address on the web that starts with https://.'));
  assert.ok(bad.some(x => /web comes first/.test(x)));
  assert.ok(bad.includes('Android is listed twice.'));
  assert.ok(bad.includes('"gameboy" is not one of the platforms.'));
  assert.ok(bad.some(x => /link for windows/.test(x)));
});

test('the credential carries every part Open Badges 3.0 requires', () => {
  const c = lib.buildCredential(row);
  assert.deepEqual(c['@context'], ['https://www.w3.org/ns/credentials/v2', 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json']);
  assert.deepEqual(c.type, ['VerifiableCredential', 'OpenBadgeCredential']);
  assert.equal(c.id, 'https://humanshaped.org/credential/?id=' + row.credential);
  assert.equal(c.issuer.id, 'did:web:humanshaped.org');
  assert.deepEqual(c.issuer.type, ['Profile']);
  assert.equal(c.validFrom, '2026-09-20T18:30:00Z');
  const s = c.credentialSubject;
  assert.deepEqual(s.type, ['AchievementSubject']);
  assert.equal(s.id, 'https://github.com/bea-example');
  assert.deepEqual(s.identifier, [{ type: 'IdentityObject', identityType: 'name', hashed: false, identityHash: 'Bea Example' }]);
  for (const k of ['id', 'type', 'name', 'description', 'criteria']) assert.ok(s.achievement[k], k);
  assert.deepEqual(c.evidence.map(e => e.id), ['https://github.com/bea-example/garden-swap', 'https://bea-example.github.io/garden-swap/', 'https://play.google.com/store/apps/details?id=x']);
  assert.ok(c.evidence.every(e => e.type[0] === 'Evidence'));
  assert.equal(c.description, 'For Garden Swap, built in Test cohort.');
});

test('a person with no display name is named by their GitHub username', () => {
  const c = lib.buildCredential({ ...row, person: { github_login: 'bea-example', name: null } });
  assert.equal(c.credentialSubject.identifier[0].identityHash, 'bea-example');
});

test('describe reads a credential back for the public page', () => {
  const d = lib.describe(lib.buildCredential(row));
  assert.equal(d.title, 'Human-shaped software, live on two platforms');
  assert.equal(d.name, 'Bea Example');
  assert.equal(d.login, 'bea-example');
  assert.equal(d.level, 2);
  assert.equal(d.evidence.length, 3);
});

test('a signed file must say exactly what its row says', () => {
  const c = lib.buildCredential(row);
  c.proof = { proofValue: 'z1' };
  assert.equal(lib.matchesRow(c, row), true);
  assert.equal(lib.matchesRow(c, { ...row, person: { github_login: 'bea-example', name: 'Someone' } }), false);
  assert.equal(lib.matchesRow({ ...c, proof: undefined }, row), false);
});

test('the achievement files on the site are the ones the code makes', () => {
  lib.PLATFORMS.forEach((p, i) => {
    const level = i + 1;
    const path = `credential/achievements/level-${level}.json`;
    assert.ok(existsSync(new URL(path, root)), path);
    assert.deepEqual(JSON.parse(read(path)), lib.achievementDocument(level));
  });
});

test('the migration allows exactly the platforms the code knows', () => {
  const sql = read('supabase/migrations/20261003070000_credentials.sql');
  const list = /array\[([^\]]+)\]::text\[\]/.exec(sql)[1].match(/'([^']+)'/g).map(x => x.slice(1, -1));
  assert.deepEqual(list, lib.PLATFORMS.map(p => p.id));
});

test('the published DID document holds no secret and lists its keys by full id', () => {
  const text = read('.well-known/did.json');
  assert.ok(!/secret/i.test(text));
  const did = JSON.parse(text);
  assert.equal(did.id, 'did:web:humanshaped.org');
  did.verificationMethod.forEach(m => {
    assert.ok(m.id.startsWith('did:web:humanshaped.org#'));
    assert.ok(did.assertionMethod.includes(m.id));
  });
  assert.ok(did.assertionMethod.every(a => typeof a === 'string'));
});

test('the contexts kept on the site are the published ones, unchanged', async () => {
  // The SHA-256 of the VC 2.0 context is the one the W3C publishes.
  const hash = async p => Buffer.from(await crypto.subtle.digest('SHA-256', readFileSync(new URL(p, root)))).toString('hex');
  assert.equal(await hash('credential/contexts/credentials-v2.json'), '59955ced6697d61e03f2b2556febe5308ab16842846f5b586d7f1f7adec92734');
  assert.equal(await hash('credential/contexts/ob-v3p0-context-3.0.3.json'), '3d34f4d4ef1bce691106e63798beb5e7b862ba841423f5ee1e53ab7ddf3bca84');
});
