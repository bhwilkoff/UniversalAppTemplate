import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { webcrypto, createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const G = require('../../assets/google-signin-lib.js');

test('a nonce is fresh each time, and Google gets its SHA-256 while Supabase gets the raw one', async () => {
  const a = await G.nonce(webcrypto);
  const b = await G.nonce(webcrypto);
  assert.match(a.raw, /^[0-9a-f]{64}$/);
  assert.notEqual(a.raw, b.raw);
  assert.equal(a.hashed, createHash('sha256').update(a.raw).digest('hex'));
});

test('linked accounts are read from the identities, and the last one cannot be unlinked', () => {
  const both = [{ provider: 'github', id: '1' }, { provider: 'google', id: '2' }];
  assert.deepEqual(G.linked(both), { github: true, google: true, count: 2 });
  assert.equal(G.canUnlink(both, 'google'), true);
  assert.equal(G.canUnlink([{ provider: 'github' }], 'github'), false);
  assert.equal(G.canUnlink(both, 'email'), false);
  assert.equal(G.identityFor(both, 'google').id, '2');
  assert.equal(G.identityFor(null, 'google'), null);
});

test('without a GitHub name, a person is asked to link GitHub', () => {
  assert.equal(G.needsGitHub({ github_login: null }), true);
  assert.equal(G.needsGitHub(null), true);
  assert.equal(G.needsGitHub({ github_login: 'bea' }), false);
});

test('only an empty, Google-only account is offered for removal', () => {
  assert.equal(G.emptyGoogleOnly([{ provider: 'google' }], { github_login: null }), true);
  assert.equal(G.emptyGoogleOnly([{ provider: 'google' }, { provider: 'github' }], { github_login: null }), false);
  assert.equal(G.emptyGoogleOnly([{ provider: 'google' }], { github_login: 'bea' }), false);
  assert.equal(G.emptyGoogleOnly([{ provider: 'github' }], { github_login: null }), false);
});

test('an account already linked elsewhere is recognised by code or words', () => {
  assert.equal(G.alreadyLinkedElsewhere({ code: 'identity_already_exists' }), true);
  assert.equal(G.alreadyLinkedElsewhere({ message: 'Identity is already linked to another user' }), true);
  assert.equal(G.alreadyLinkedElsewhere({ message: 'network down' }), false);
  assert.equal(G.alreadyLinkedElsewhere(null), false);
});

test('the link window only answers the panel that opened it, on this origin', () => {
  const panel = {};
  const ok = { origin: 'https://humanshaped.org', source: panel, data: G.wantMessage() };
  assert.equal(G.isWant(ok, 'https://humanshaped.org', panel), true);
  assert.equal(G.isWant({ ...ok, origin: 'https://evil.example' }, 'https://humanshaped.org', panel), false);
  assert.equal(G.isWant({ ...ok, source: {} }, 'https://humanshaped.org', panel), false);
  assert.equal(G.isWant({ ...ok, data: { type: 'other' } }, 'https://humanshaped.org', panel), false);
  assert.equal(G.linkWindowUrl('https://humanshaped.org'), 'https://humanshaped.org/account/?link=github&handoff=meet');
});
