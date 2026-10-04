// The Google ID token check the notices and setup-queue functions share
// (supabase/functions/_shared/google-id.js), against a key made here and
// a fake set of Google's keys.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { verifyGoogleIdToken, claimsProblem, audienceOk, optionsFromEnv, callerAllowed } from '../../supabase/functions/_shared/google-id.js';

const subtle = webcrypto.subtle;
const b64url = (bytes) => Buffer.from(bytes).toString('base64url');
const enc = (o) => b64url(Buffer.from(JSON.stringify(o)));

const pair = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const other = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const pub = await subtle.exportKey('jwk', pair.publicKey);
const jwks = { keys: [{ kty: 'RSA', kid: 'k1', n: pub.n, e: pub.e, alg: 'RS256', use: 'sig' }] };

const NOW = 1_790_000_000;
const AUD = '1086485459450-abc123.apps.googleusercontent.com';
const good = { iss: 'https://accounts.google.com', aud: AUD, azp: AUD, sub: '1', email: 'meet@humanshaped.org', email_verified: true, hd: 'humanshaped.org', iat: NOW - 10, exp: NOW + 3000 };
const opts = optionsFromEnv(() => undefined, NOW);

async function sign(claims, { key = pair.privateKey, header = { alg: 'RS256', kid: 'k1', typ: 'JWT' } } = {}) {
  const body = enc(header) + '.' + enc(claims);
  const sig = await subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(body));
  return body + '.' + b64url(new Uint8Array(sig));
}

test('a token from meet@, signed by a published key, for this project, passes', async () => {
  const r = await verifyGoogleIdToken(await sign(good), jwks, opts);
  assert.equal(r.ok, true);
  assert.equal(r.claims.email, 'meet@humanshaped.org');
});

test('a forged signature, an unknown key, or another algorithm fails', async () => {
  assert.equal((await verifyGoogleIdToken(await sign(good, { key: other.privateKey }), jwks, opts)).reason, 'signature');
  assert.equal((await verifyGoogleIdToken(await sign(good, { header: { alg: 'RS256', kid: 'nope' } }), jwks, opts)).reason, 'unknown key');
  assert.equal((await verifyGoogleIdToken(await sign(good, { header: { alg: 'none', kid: 'k1' } }), jwks, opts)).reason, 'algorithm');
  assert.equal((await verifyGoogleIdToken('not.a', jwks, opts)).reason, 'shape');
  // A real signature over different claims does not carry over.
  const t = (await sign(good)).split('.');
  t[1] = enc({ ...good, email: 'someone@humanshaped.org' });
  assert.equal((await verifyGoogleIdToken(t.join('.'), jwks, opts)).reason, 'signature');
});

test('every claim is checked', () => {
  const p = (c) => claimsProblem({ ...good, ...c }, opts);
  assert.equal(p({}), null);
  assert.equal(p({ iss: 'https://evil.example' }), 'issuer');
  assert.equal(p({ iss: 'accounts.google.com' }), null);
  assert.equal(p({ exp: NOW - 200 }), 'expired');
  assert.equal(p({ exp: NOW - 60 }), null); // a little clock room
  assert.equal(p({ iat: NOW + 600 }), 'issued in the future');
  assert.equal(p({ aud: '999-abc.apps.googleusercontent.com' }), 'audience');
  assert.equal(p({ email_verified: false }), 'email not verified');
  assert.equal(p({ email: 'ben@learningischange.com' }), 'email');
  assert.equal(p({ email: 'MEET@humanshaped.org' }), null);
  assert.equal(p({ hd: undefined }), 'domain');
});

test('the audience is pinned exactly once it is known, and by project number until then', () => {
  assert.equal(audienceOk(AUD, { audiencePrefixes: ['1086485459450-'] }), true);
  assert.equal(audienceOk('1086485459450-x.example.com', { audiencePrefixes: ['1086485459450-'] }), false);
  assert.equal(audienceOk('10864854594500-x.apps.googleusercontent.com', { audiencePrefixes: ['1086485459450-'] }), false);
  assert.equal(audienceOk(AUD, { audiences: ['1086485459450-other.apps.googleusercontent.com'], audiencePrefixes: ['1086485459450-'] }), false);
  const env = { GOOGLE_ID_AUDIENCES: ' ' + AUD + ' ', GOOGLE_ID_EMAILS: 'a@humanshaped.org,b@humanshaped.org' };
  const o = optionsFromEnv((k) => env[k], NOW);
  assert.deepEqual(o.audiences, [AUD]);
  assert.deepEqual(o.allowedEmails, ['a@humanshaped.org', 'b@humanshaped.org']);
});

function req(headers) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: { get: (k) => h.get(k.toLowerCase()) ?? null } };
}
const same = (a, b) => a === b;
const fakeFetch = async () => ({ ok: true, json: async () => jwks });

test('callerAllowed takes a token, or the old secret while it is set, and nothing else', async () => {
  const secret = 'x'.repeat(64);
  const env = { NOTICES_SECRET: secret };
  const base = { get: (k) => env[k], secretName: 'NOTICES_SECRET', secretHeader: 'x-notices-secret', sameSecret: same, fetchFn: fakeFetch };
  // The token's own clock check uses the real time, so sign one for now.
  const now = Math.floor(Date.now() / 1000);
  const fresh = await sign({ ...good, iat: now - 5, exp: now + 3000 });
  assert.deepEqual(await callerAllowed(req({ Authorization: 'Bearer ' + fresh }), base), { ok: true, by: 'google' });
  assert.equal((await callerAllowed(req({ Authorization: 'Bearer ' + (await sign(good, { key: other.privateKey })) }), base)).ok, false);
  assert.deepEqual(await callerAllowed(req({ 'x-notices-secret': secret }), base), { ok: true, by: 'secret' });
  assert.equal((await callerAllowed(req({ 'x-notices-secret': 'wrong' }), base)).ok, false);
  assert.equal((await callerAllowed(req({ 'x-notices-secret': secret }), { ...base, get: () => undefined })).ok, false);
  assert.equal((await callerAllowed(req({}), base)).reason, 'no credentials');
});
