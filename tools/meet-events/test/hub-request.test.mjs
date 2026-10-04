// hubRequest: how the script calls the hub's notices and setup-queue
// functions. The Google identity token is the proof; nothing has to be
// pasted into Script Properties.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../Code.gs', import.meta.url), 'utf8');
const gs = vm.createContext({ console });
vm.runInContext(source, gs, { filename: 'Code.gs' });

test('with no Script Properties, each function has its known address and the token', () => {
  const n = gs.hubRequest('NOTICES', {}, 'tok');
  assert.equal(n.url, 'https://bifrieqzkihuxfzttgvd.supabase.co/functions/v1/notices');
  assert.deepEqual({ ...n.headers }, { Authorization: 'Bearer tok' });
  const q = gs.hubRequest('SETUP_QUEUE', { SETUP_QUEUE_URL: null }, 'tok');
  assert.equal(q.url, 'https://bifrieqzkihuxfzttgvd.supabase.co/functions/v1/setup-queue');
});

test('a token wins over an old secret, which is never sent beside it', () => {
  const r = gs.hubRequest('NOTICES', { NOTICES_SECRET: 's'.repeat(64) }, 'tok');
  assert.deepEqual({ ...r.headers }, { Authorization: 'Bearer tok' });
});

test('without a token, an old secret still works, and with neither it says what to do', () => {
  const r = gs.hubRequest('SETUP_QUEUE', { SETUP_QUEUE_SECRET: 'abc' }, null);
  assert.deepEqual({ ...r.headers }, { 'x-setup-secret': 'abc' });
  assert.throws(() => gs.hubRequest('NOTICES', {}, null), /whoAmI/);
});

test('a URL in Script Properties overrides the default', () => {
  assert.equal(gs.hubRequest('NOTICES', { NOTICES_URL: ' https://example.test/n ' }, 't').url, 'https://example.test/n');
});

test('the manifest asks for openid, which getIdentityToken needs', () => {
  const m = JSON.parse(readFileSync(new URL('../appsscript.json', import.meta.url), 'utf8'));
  assert.ok(m.oauthScopes.includes('openid'));
  assert.ok(m.oauthScopes.includes('https://www.googleapis.com/auth/userinfo.email'));
});
