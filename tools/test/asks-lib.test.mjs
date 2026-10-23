// "Try my app" (assets/asks-lib.js): node --test tools/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../../assets/asks-lib.js');

const now = new Date('2026-10-22T12:00:00Z');
const issue = (n, o = {}) => ({ number: n, title: 'Try ' + n, html_url: 'https://github.com/humanshaped/kit/issues/' + n, user: { login: 'bea' }, state: 'open', assignees: [], updated_at: '2026-10-21T00:00:00Z', ...o });

test('open with no one on it is Waiting, open with someone is being tried, closed is Tried', () => {
  const c = A.columns([
    issue(2), issue(1),
    issue(3, { assignees: [{ login: 'cal' }] }),
    issue(4, { state: 'closed', closed_at: '2026-10-20T00:00:00Z' }),
    issue(5, { state: 'closed', closed_at: '2026-09-01T00:00:00Z' }),
    issue(6, { pull_request: {} }),
  ], now);
  assert.deepEqual(c.asked.map((x) => x.number), [1, 2]);
  assert.deepEqual(c.taken.map((x) => [x.number, x.holders]), [[3, ['cal']]]);
  assert.deepEqual(c.done.map((x) => x.number), [4]);
  assert.deepEqual(A.COLUMNS.map((x) => x.label), ['Waiting', 'Someone is trying it', 'Tried']);
});

test('a card carries the device and the address its request names', () => {
  const made = A.newTry('Open the trivia game', 'An Android phone', 'https://bea.github.io/trivia/', 'It needs sound on.');
  const c = A.columns([issue(1, { body: made.body.body })], now);
  assert.equal(c.asked[0].device, 'An Android phone');
  assert.equal(c.asked[0].app, 'https://bea.github.io/trivia/');
});

test('anyone else can take a waiting request; whoever has it lets it go or marks it tried; the asker asks again', () => {
  assert.deepEqual(A.moves({ by: 'bea', holders: [] }, 'asked', 'cal'), ['take']);
  assert.deepEqual(A.moves({ by: 'bea', holders: [] }, 'asked', 'bea'), []);
  assert.deepEqual(A.moves({ by: 'bea', holders: ['cal'] }, 'taken', 'cal'), ['release', 'done']);
  assert.deepEqual(A.moves({ by: 'bea', holders: ['cal'] }, 'taken', 'dee'), ['take']);
  assert.deepEqual(A.moves({ by: 'bea', holders: [] }, 'done', 'bea'), ['reopen']);
  assert.deepEqual(A.moves({ by: 'bea', holders: [] }, 'done', 'cal'), []);
});

test('each move is one GitHub request, and marking it tried says what they saw first', () => {
  const card = { number: 7 };
  assert.deepEqual(A.request('humanshaped/kit', card, 'take', 'bea'),
    { method: 'POST', url: 'https://api.github.com/repos/humanshaped/kit/issues/7/assignees', body: { assignees: ['bea'] } });
  assert.equal(A.request('humanshaped/kit', card, 'release', 'bea').method, 'DELETE');
  assert.deepEqual(A.request('humanshaped/kit', card, 'done', 'bea').body, { state: 'closed', state_reason: 'completed' });
  assert.equal(A.request('humanshaped/kit', card, 'delete', 'bea'), null);
  assert.deepEqual(A.sawComment('humanshaped/kit', card, ' The menu was hidden. ').body, { body: '**What I saw:** The menu was hidden.' });
  assert.equal(A.sawComment('humanshaped/kit', card, ' ').problem, 'Say what you saw');
});

test('a new request names what to try and the device, and carries the label', () => {
  const made = A.newTry('  Sign in   and save a film ', 'An iPhone', '', '');
  assert.deepEqual(made.body, { title: 'Sign in and save a film', body: '**On:** An iPhone', labels: ['try-my-app'] });
  assert.equal(A.newTry(' ', 'An iPhone').problem, 'Say what they should try');
  assert.equal(A.newTry('x', 'A toaster').problem, 'Choose the device');
  assert.ok(A.newTry('x', 'An iPhone', 'http://not-secure').problem);
  assert.equal(A.listUrl('humanshaped/kit'), 'https://api.github.com/repos/humanshaped/kit/issues?labels=try-my-app&state=all&per_page=100&sort=created&direction=asc');
});
